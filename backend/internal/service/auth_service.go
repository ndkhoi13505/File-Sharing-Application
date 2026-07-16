package service

import (
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/domain"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/jwt"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/repository"
	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
	"github.com/pquerna/otp/totp"
	"github.com/skip2/go-qrcode"
	"golang.org/x/crypto/bcrypt"
)

type authService struct {
	userRepo     repository.UserRepository
	authRepo     repository.AuthRepository
	tokenService jwt.TokenService
}

func NewAuthService(userRepo repository.UserRepository, authRepo repository.AuthRepository, tokenService jwt.TokenService) AuthService {
	return &authService{
		userRepo:     userRepo,
		authRepo:     authRepo,
		tokenService: tokenService,
	}
}

func (us *authService) CreateUser(username, password, email string) (*domain.User, *utils.ReturnStatus) {
	email = utils.NormalizeString(email)

	existingUserByEmail := &domain.User{}
	errEmail := us.userRepo.FindByEmail(email, existingUserByEmail)
	if errEmail == nil && existingUserByEmail.Id != "" {
		return nil, utils.ResponseMsg(utils.ErrCodeConflict, "Email already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, utils.ResponseMsg(utils.ErrCodeInternal, "Failed to hash password")
	}
	hashedUserID, err := uuid.NewRandom()
	if err != nil {
		return nil, utils.ResponseMsg(utils.ErrCodeInternal, "Failed to create UserID")
	}

	user := &domain.User{
		Id:         hashedUserID.String(),
		Username:   username,
		Password:   string(hashedPassword),
		Email:      email,
		Role:       "user",
		EnableTOTP: false,
		SecretTOTP: "",
	}
	return us.authRepo.Create(user)
}

func (as *authService) Login(email, password string) (*domain.User, string, *utils.ReturnStatus) {
	email = utils.NormalizeString(email)
	user := &domain.User{}
	err := as.userRepo.FindByEmail(email, user)
	if err != nil {
		fmt.Println("Login failed: User not found")
		return nil, "", utils.Response(utils.ErrCodeLoginInvalid)
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) != nil {
		return nil, "", utils.Response(utils.ErrCodeLoginInvalid)
	}

	if user.EnableTOTP {
		cid, err := uuid.NewUUID()
		if err != nil {
			return nil, "", utils.ResponseMsg(utils.ErrCodeInternal, "Failed to generate CID")
		}
		timstamp_err := as.userRepo.AddTimestamp(user.Id, cid.String())
		if timstamp_err != nil {
			return nil, "", timstamp_err
		}
		return user, cid.String(), nil
	}

	accessToken, gen_err := as.tokenService.GenerateAccessToken(*user)

	if gen_err != nil {
		fmt.Println("*utils.ReturnStatus generating access token:", err)
		return nil, "", utils.ResponseMsg(utils.ErrCodeInternal, fmt.Sprintf("Failed to generate access token: %s", gen_err.Error()))
	}

	return user, accessToken, nil

}
func (as *authService) LoginTOTP(cid, totpCode string) (*domain.User, string, *utils.ReturnStatus) {
	// Find session
	sess := &domain.UsersLoginSession{}
	if err := as.userRepo.FindByCId(cid, sess); err != nil {
		return nil, "", utils.ResponseMsg(utils.ErrCodeUnauthorized, "Wrong CID")
	}

	// Find user
	user := &domain.User{}
	if err := as.userRepo.FindById(sess.Id, user); err != nil {
		return nil, "", utils.ResponseMsg(utils.ErrCodeUnauthorized, "Invalid ID")
	}

	// Validate TOTP
	if !totp.Validate(totpCode, user.SecretTOTP) {
		return nil, "", utils.ResponseMsg(utils.ErrCodeUnauthorized, "Invalid or expired TOTP code")
	}

	// Parse UUID & check expiration
	CID, err := uuid.Parse(cid)
	if err != nil {
		return nil, "", utils.ResponseMsg(utils.ErrCodeUnauthorized, "Invalid CID format")
	}

	ts := CID.Time()
	now, _, err := uuid.GetTime()
	if err != nil {
		return nil, "", utils.ResponseMsg(utils.ErrCodeUnauthorized, "Failed to get current time")
	}

	// Always delete timestamp first
	if err := as.userRepo.DeleteTimestamp(user.Id); err != nil {
		return nil, "", utils.ResponseMsg(utils.ErrCodeUnauthorized, "Delete timestamp failed")
	}

	// Check expiration (5 minutes)
	if int64(now-ts) > 300*10_000_000 {
		return nil, "", utils.ResponseMsg(utils.ErrCodeUnauthorized, "CID has expired")
	}

	// Generate access token
	accessToken, err := as.tokenService.GenerateAccessToken(*user)
	if err != nil {
		return nil, "", utils.ResponseMsg(utils.ErrCodeUnauthorized,
			fmt.Sprintf("Failed to generate access token: %s", err))
	}

	return user, accessToken, nil
}

func (as *authService) Logout(ctx *gin.Context) *utils.ReturnStatus {
	authHeader := ctx.GetHeader("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return utils.ResponseMsg(utils.ErrCodeUnauthorized, "Missing Authorization header")
	}

	accessToken := strings.TrimPrefix(authHeader, "Bearer ")

	claims, err := as.tokenService.ParseToken(accessToken)
	if err != nil {
		return utils.ResponseMsg(utils.ErrCodeUnauthorized, "Invalid access token")
	}

	return as.authRepo.BlacklistToken(
		accessToken,
		claims.ExpiresAt.Time,
	)
}

func (as *authService) SetupTOTP(userID string) (*TOTPSetupResponse, *utils.ReturnStatus) {
	user := &domain.User{}
	error := as.userRepo.FindById(userID, user)
	if error != nil {
		return nil, utils.ResponseMsg(utils.ErrCodeInternal, "Invalid ID")
	}

	const appName = "File Sharing"
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      appName,
		AccountName: user.Username,
	})
	if err != nil {
		return nil, utils.ResponseMsg(utils.ErrCodeInternal, err.Error())
	}

	secret := key.Secret()
	otpURL := key.URL()

	if err := as.authRepo.SaveSecret(userID, secret); err != nil {
		return nil, err
	}

	png, err := qrcode.Encode(otpURL, qrcode.Medium, 256)
	if err != nil {
		return nil, utils.ResponseMsg(utils.ErrCodeInternal, err.Error())
	}
	qrBase64 := "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)

	return &TOTPSetupResponse{
		Secret: secret,
		QRCode: qrBase64,
	}, nil
}

func (as *authService) VerifyTOTP(userID string, code string) (bool, *utils.ReturnStatus) {
	secret, err := as.authRepo.GetSecret(userID)
	if err != nil {
		return false, err
	}

	valid := totp.Validate(code, secret)

	if valid {
		if err := as.authRepo.EnableTOTP(userID); err != nil {
			return true, utils.ResponseMsg(utils.ErrCodeInternal, fmt.Sprintf("verified but failed to enable status: %v", err))
		}
	}

	return valid, nil
}

func (as *authService) DisableTOTP(userID string, code string) (bool, *utils.ReturnStatus) {
	// 1. Lấy secret hiện tại của user để kiểm chứng
	secret, err := as.authRepo.GetSecret(userID)
	if err != nil {
		return false, err
	}

	// Nếu user chưa từng cài TOTP thì không cần tắt
	if secret == "" {
		return false, utils.ResponseMsg(utils.ErrCodeBadRequest, "TOTP is not enabled for this account")
	}

	// 2. Xác thực mã code người dùng gửi lên
	valid := totp.Validate(code, secret)
	if !valid {
		return false, nil // Trả về false để báo mã code không chính xác
	}

	// 3. Nếu mã hợp lệ, tiến hành tắt trong DB
	if err := as.authRepo.DisableTOTP(userID); err != nil {
		return true, utils.ResponseMsg(utils.ErrCodeInternal, fmt.Sprintf("Failed to disable TOTP: %v", err))
	}

	return true, nil
}

func (as *authService) ChangePassword(userID string, oldPassword, newPassword string) *utils.ReturnStatus {
	// 1. Lấy thông tin user hiện tại từ Database
	user := &domain.User{}
	if err := as.userRepo.FindById(userID, user); err != nil {
		return utils.ResponseMsg(utils.ErrCodeInternal, "User not found")
	}

	// 2. So sánh mật khẩu cũ người dùng nhập với mật khẩu lưu trong DB
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword)); err != nil {
		return utils.ResponseMsg(utils.ErrCodeBadRequest, "Mật khẩu cũ không chính xác")
	}

	// Kiểm tra xem mật khẩu mới có trùng mật khẩu cũ không (Tùy chọn bảo mật bổ sung)
	if oldPassword == newPassword {
		return utils.ResponseMsg(utils.ErrCodeBadRequest, "Mật khẩu mới không được trùng với mật khẩu cũ")
	}

	// 3. Tiến hành mã hóa mật khẩu mới
	newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return utils.ResponseMsg(utils.ErrCodeInternal, "Không thể mã hóa mật khẩu mới")
	}

	// 4. Lưu mật khẩu mới vào DB thông qua repo
	if repoErr := as.authRepo.ChangePassword(userID, string(newPasswordHash)); repoErr != nil {
		return repoErr
	}

	return nil
}
