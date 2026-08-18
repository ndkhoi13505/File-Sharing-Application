package service

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ndkhoi13505/File-Sharing-Application/config"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/dto"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/domain"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/storage"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/repository"
	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
	"golang.org/x/crypto/bcrypt"
)

type fileService struct {
	cfg        *config.Config
	fileRepo   repository.FileRepository
	sharedRepo repository.SharedRepository
	userRepo   repository.UserRepository
	storage    storage.Storage
}

func NewFileService(cfg *config.Config, fr repository.FileRepository, sr repository.SharedRepository, ur repository.UserRepository, s storage.Storage) FileService {
	return &fileService{
		cfg:        cfg,
		fileRepo:   fr,
		sharedRepo: sr,
		userRepo:   ur,
		storage:    s,
	}
}

// Hàm tính toán thời gian hiệu lực
func (s *fileService) calculateValidityPeriod(req *dto.UploadRequest) (time.Time, time.Time, int, *utils.ReturnStatus) {
	now := time.Now().UTC()
	policy := s.cfg.Policy

	var availableFrom, availableTo time.Time
	var validityDays int

	// 1. Trường hợp chọn Vĩnh viễn (0 ngày)
	if req.ValidityDays == 0 && req.AvailableTo == nil {
		availableFrom = now
		availableTo = time.Date(2099, 12, 31, 23, 59, 59, 0, time.UTC)
		return availableFrom, availableTo, 0, nil
	}

	// 2. Trường hợp chọn theo số ngày (1, 3, 7, 30 ngày)
	if req.ValidityDays > 0 && req.AvailableTo == nil {
		availableFrom = now
		availableTo = now.Add(time.Hour * 24 * time.Duration(req.ValidityDays))
	} else if req.AvailableFrom != nil && req.AvailableTo != nil {
		availableFrom = *req.AvailableFrom
		availableTo = *req.AvailableTo
	} else if req.AvailableTo != nil {
		availableFrom = now
		availableTo = *req.AvailableTo
	} else if req.AvailableFrom != nil {
		availableFrom = *req.AvailableFrom
		availableTo = req.AvailableFrom.Add(time.Hour * 24 * time.Duration(policy.DefaultValidityDays))
	} else {
		availableFrom = now
		availableTo = now.Add(time.Hour * 24 * time.Duration(policy.DefaultValidityDays))
	}

	// 3. Validation thời hạn
	if availableFrom.After(availableTo) {
		return time.Time{}, time.Time{}, 0, utils.ResponseMsg(utils.ErrCodeBadRequest, "AvailableFrom cannot be after AvailableTo")
	}

	duration := availableTo.Sub(availableFrom)
	validityDays = int(duration.Hours() / 24)

	minDuration := time.Duration(policy.MinValidityHours) * time.Hour
	maxDuration := time.Duration(policy.MaxValidityDays) * 24 * time.Hour

	if duration < minDuration {
		return time.Time{}, time.Time{}, 0, utils.ResponseMsg(utils.ErrCodeBadRequest, fmt.Sprintf("Validity period must be at least %d hours", policy.MinValidityHours))
	}
	// Bỏ qua check MaxDuration nếu đặt là Vĩnh viễn (năm 2099)
	if duration > maxDuration && availableTo.Year() < 2090 && policy.MaxValidityDays > 0 {
		return time.Time{}, time.Time{}, 0, utils.ResponseMsg(utils.ErrCodeBadRequest, fmt.Sprintf("Validity period cannot exceed %d days", policy.MaxValidityDays))
	}

	return availableFrom, availableTo, validityDays, nil
}

func (s *fileService) UploadFile(ctx context.Context, fileHeader *multipart.FileHeader, req *dto.UploadRequest, ownerID *string) (*domain.File, *utils.ReturnStatus) {
	// Kiểm tra kích thước file (Sử dụng MaxFileSizeMB từ Policy)
	if fileHeader.Size > int64(s.cfg.Policy.MaxFileSizeMB)*1024*1024 {
		return nil, utils.Response(utils.ErrCodeUploadFileTooBig)
	}

	// 1. Tính toán thời gian hiệu lực
	availableFrom, availableTo, validityDays, err := s.calculateValidityPeriod(req)
	if err.IsErr() {
		return nil, err
	}

	if len(req.SharedWith) > 0 {
		missingEmails, errStatus := s.userRepo.FindNonExistingEmails(req.SharedWith)
		if errStatus != nil {
			return nil, errStatus
		}

		// Nếu phát hiện có ít nhất 1 email chưa từng đăng ký tài khoản -> Trả lỗi báo Bad Request!
		if len(missingEmails) > 0 {
			return nil, utils.ResponseMsg(
				utils.ErrCodeBadRequest,
				fmt.Sprintf("Invalid email(s) or not found: %s", strings.Join(missingEmails, ", ")),
			)
		}
	}

	// 2. Chuẩn bị File Metadata
	fileUUID := uuid.New().String()
	shareToken := utils.GenerateRandomString(16) // Hàm tạo token ngẫu nhiên 16 ký tự

	var passwordHash *string
	if req.Password != nil && *req.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, utils.ResponseMsg(utils.ErrCodeInternal, err.Error())
		}
		hashStr := string(hashed)
		passwordHash = &hashStr
	}

	storageFileName := fileUUID
	newFile := &domain.File{
		Id:            fileUUID,
		OwnerId:       ownerID,
		FileName:      fileHeader.Filename,
		StorageName:   storageFileName, // Tên file trên thiết bị lưu trữ vật lý là UUID của file
		FileSize:      fileHeader.Size,
		MimeType:      fileHeader.Header.Get("Content-Type"),
		ShareToken:    shareToken,
		IsPublic:      req.IsPublic || ownerID == nil, // File phải public khi được upload ẩn danh
		HasPassword:   passwordHash != nil,
		PasswordHash:  passwordHash,
		AvailableFrom: availableFrom,
		AvailableTo:   availableTo,
		ValidityDays:  validityDays,
		CreatedAt:     time.Now().UTC(),
	}

	// 3. Lưu file vật lý
	_, err = s.storage.SaveFile(fileHeader, newFile.StorageName)
	if err.IsErr() {
		return nil, err
	}

	// 4. Lưu Metadata vào DB
	savedFile, err := s.fileRepo.CreateFile(ctx, newFile)
	if err.IsErr() {
		// QUAN TRỌNG: Nếu lưu DB lỗi, phải xóa file đã lưu vật lý!
		s.storage.DeleteFile(newFile.StorageName)
		return nil, err
	}

	// 5. Xử lý SharedWith
	if req.SharedWith != nil {
		if err := s.sharedRepo.ShareFileWithUsers(ctx, savedFile.Id, req.SharedWith); err != nil {
			return nil, err
		}
	}

	return savedFile, nil
}

func (s *fileService) GetMyFiles(ctx context.Context, userID string, params domain.ListFileParams) (interface{}, *utils.ReturnStatus) {
	// Lấy danh sách file của user đó
	fileSummary, err := s.fileRepo.GetFileSummary(ctx, userID)
	if err.IsErr() {
		// Log lỗi hoặc xử lý lỗi một cách nhẹ nhàng hơn nếu summary không bắt buộc
		// Trong trường hợp này, ta sẽ trả về lỗi
		return nil, err
	}
	totalFiles, err := s.fileRepo.GetTotalUserFiles(ctx, userID, params.Search)
	if err.IsErr() {
		return nil, err
	}
	files, err := s.fileRepo.GetMyFiles(ctx, userID, params)
	if err.IsErr() {
		return nil, err
	}
	totalPages := 0
	if params.Limit > 0 {
		totalPages = (totalFiles + params.Limit - 1) / params.Limit
	}

	pagination := gin.H{
		"currentPage": params.Page,
		"totalPages":  totalPages,
		"totalFiles":  totalFiles,
		"limit":       params.Limit,
	}

	out := []gin.H{}

	for _, f := range files {
		out = append(out, gin.H{
			"id":         f.Id,
			"fileName":   f.FileName,
			"fileSize":   f.FileSize,
			"shareToken": f.ShareToken,
			"status":     f.Status,
			"createdAt":  f.CreatedAt,
			"isPublic":   f.IsPublic,
			"availableFrom": f.AvailableFrom, // 🌟 BỔ SUNG DÒNG NÀY
            "availableTo":   f.AvailableTo,
		})
	}

	// 5. Trả về kết quả với dữ liệu thực tế
	return gin.H{
		"files":      out,
		"pagination": pagination,  // Dữ liệu phân trang thực tế
		"summary":    fileSummary, // Dữ liệu summary thực tế
	}, nil
}

func (s *fileService) DeleteFile(ctx context.Context, fileID string, userID string) *utils.ReturnStatus {
	file, err := s.fileRepo.GetFileByID(ctx, fileID)
	if err.IsErr() {
		return err
	}
	var requester domain.User
	if errStatus := s.userRepo.FindById(userID, &requester); errStatus != nil {
		return errStatus
	}

	// Kiểm tra quyền: Chỉ Owner hoặc Admin mới được xóa
	isAdmin := requester.Role == "admin"
	isOwner := file.OwnerId != nil && *file.OwnerId == userID
	isAnonymous := file.OwnerId == nil

	if isAnonymous {
		if !isAdmin {
			return utils.Response(utils.ErrCodeDeleteValidationErr)
		}
	} else {
		if !isOwner && !isAdmin {
			return utils.Response(utils.ErrCodeDeleteValidationErr)
		}
	}

	// Xóa vật lý trước
	if err := s.storage.DeleteFile(fileID); err.IsErr() {
		return err
	}

	if err := s.fileRepo.DeleteFile(ctx, fileID); err.IsErr() {
		log.Println("Can't find file in database")
		return err
	}

	return nil
}

// 🌟 1. Bổ sung tham số password string vào signature hàm
func (s *fileService) getFileInfo(ctx context.Context, id string, userID string, password string, isToken bool, verbose bool) (*domain.File, *domain.User, []string, *utils.ReturnStatus) {
	var file *domain.File = nil
	var err *utils.ReturnStatus = nil
	if isToken {
		file, err = s.fileRepo.GetFileByToken(ctx, id)
	} else {
		file, err = s.fileRepo.GetFileByID(ctx, id)
	}

	if err.IsErr() {
		return nil, nil, nil, err
	}

	now := time.Now()

	file.Status = domain.FILE_ACTIVE

	if now.Before(file.AvailableFrom) {
		file.Status = domain.FILE_PENDING
	} else if now.After(file.AvailableTo) {
		file.Status = domain.FILE_EXPIRED
	}

	requester := domain.User{}
	if userID != "" {
		if err := s.userRepo.FindById(userID, &requester); err != nil {
			return nil, nil, nil, err
		}
	}

	isAdmin := requester.Role == "admin"
	owner_ := domain.User{}
	var owner *domain.User = nil
	if file.OwnerId != nil {
		if s.userRepo.FindById(*file.OwnerId, &owner_) == nil {
			owner = &owner_
		}
	}

	shareds, err := s.sharedRepo.GetUsersSharedWith(ctx, file.Id)
	if err != nil {
		return nil, nil, nil, err
	}

	if !isAdmin {
	if verbose && (file.OwnerId == nil || *file.OwnerId != userID) {
		return nil, nil, nil, utils.Response(utils.ErrCodeGetForbidden)
	}

	// 🌟 IN LOG RA TERMINAL DOCKER ĐỂ TRUY NGUYÊN NHÂN
	fmt.Println("================ DEBUG PREVIEW ================")
	fmt.Printf("👉 File ID: %s | IsPublic: %v | HasPassword: %v\n", file.Id, file.IsPublic, file.HasPassword)
	fmt.Printf("👉 UserID gui len: '%s'\n", userID)
	fmt.Printf("👉 Password client gui len (password): '%s'\n", password)
	if file.PasswordHash != nil {
		fmt.Printf("👉 PasswordHash trong DB: '%s'\n", *file.PasswordHash)
	} else {
		fmt.Println("👉 PasswordHash trong DB: NIL (file không lưu pass/hoặc bị null)")
	}

	hasValidAccess := false

	if file.IsPublic {
		fmt.Println("✅ Cho qua: File IsPublic = true")
		hasValidAccess = true
	}

	if file.OwnerId != nil && *file.OwnerId == userID {
		fmt.Println("✅ Cho qua: User la Owner")
		hasValidAccess = true
	} else if slices.Contains(shareds.UserIds, userID) {
		fmt.Println("✅ Cho qua: User co trong danh sach Shared")
		hasValidAccess = true
	}

	// Kiểm tra Mật khẩu
	if password != "" {
		if file.PasswordHash != nil {
			// Thử so sánh bcrypt
			errBcrypt := bcrypt.CompareHashAndPassword([]byte(*file.PasswordHash), []byte(password))
			if errBcrypt == nil {
				fmt.Println("✅ Cho qua: Bcrypt Password match thành công!")
				hasValidAccess = true
			} else {
				fmt.Printf("❌ Bcrypt Compare That Bai: %v\n", errBcrypt)
			}

			// Thử so sánh Plain Text
			if *file.PasswordHash == password {
				fmt.Println("✅ Cho qua: Plain Text Password match thành công!")
				hasValidAccess = true
			}
		} else {
			fmt.Println("❌ PasswordHash trong DB đang bị NULL!")
		}
	} else {
		fmt.Println("⚠️ Client KHÔNG gửi password lên!")
	}

	if !hasValidAccess {
		fmt.Println("🚫 KẾT QUẢ: Bị từ chối (ErrCodeGetForbidden - 403)!")
		fmt.Println("===============================================")
		return nil, nil, nil, utils.Response(utils.ErrCodeGetForbidden)
	}
	fmt.Println("===============================================")
}

	outShared := []string{}
	for _, id := range shareds.UserIds {
		sharedowner := domain.User{}
		serr := s.userRepo.FindById(id, &sharedowner)
		if serr != nil {
			return nil, nil, nil, utils.ResponseMsg(utils.ErrCodeInternal, "Failed to retrieve emails of shared users")
		}

		outShared = append(outShared, sharedowner.Email)
	}

	return file, owner, outShared, nil
}

func (s *fileService) GetFileInfo(ctx context.Context, token string, userID string, password string, verbose bool) (*domain.File, *domain.User, []string, *utils.ReturnStatus) {
	return s.getFileInfo(ctx, token, userID, password, true, verbose)
}

func (s *fileService) GetFileInfoID(ctx context.Context, id string, userID string, password string, verbose bool) (*domain.File, *domain.User, []string, *utils.ReturnStatus) {
	return s.getFileInfo(ctx, id, userID, password, false, verbose)
}

func (s *fileService) DownloadFile(ctx context.Context, token string, userID string, password string, registerDownload bool) (*domain.File, io.Reader, *utils.ReturnStatus) {
	fileInfo, _, _, err := s.getFileInfo(ctx, token, userID, password, true, false)

	if err.IsErr() {
		return nil, nil, err
	}

	isOwner := fileInfo.OwnerId != nil && userID != "" && *fileInfo.OwnerId == userID

	if fileInfo.HasPassword && !isOwner {
		if password == "" {
			return nil, nil, utils.Response(utils.ErrCodeDownloadPasswordInvalid)
		}

		if bcrypt.CompareHashAndPassword([]byte(*fileInfo.PasswordHash), []byte(password)) != nil {
			return nil, nil, utils.Response(utils.ErrCodeDownloadPasswordInvalid)
		}
	}

	fileReader, err := s.storage.GetFile(fileInfo.Id)
	if err.IsErr() {
		return nil, nil, err
	}

	if registerDownload {
		if err := s.fileRepo.RegisterDownload(ctx, fileInfo.Id, userID); err.IsErr() {
			return nil, nil, err
		}
	}

	return fileInfo, fileReader, nil
}

func (s *fileService) GetFileDownloadHistory(ctx context.Context, fileID string, userID string, pagenum, limit int) (*domain.FileDownloadHistory, *utils.ReturnStatus) {
	file, err := s.fileRepo.GetFileByID(ctx, fileID)
	if err.IsErr() {
		return nil, err
	}
	var requester domain.User
	if uErr := s.userRepo.FindById(userID, &requester); uErr != nil {
		return nil, uErr
	}
	isAdmin := requester.Role == "admin"

	isOwner := file.OwnerId != nil && *file.OwnerId == userID
	if !isAdmin && !isOwner {
		log.Println("Not the owner")
		return nil, utils.Response(utils.ErrCodeHistoryForbidden)
	}

	history, err := s.fileRepo.GetFileDownloadHistory(ctx, fileID)
	if err.IsErr() {
		return nil, err
	}

	if pagenum < 1 {
		pagenum = 1
	}
	if limit <= 0 {
		limit = 20
	}

	totalRecords := len(history.History)
	totalPages := 0
	if totalRecords > 0 {
		totalPages = (totalRecords + limit - 1) / limit
	}

	history.Pagination = domain.Pagination{
		CurrentPage:  pagenum,
		TotalPages:   totalPages,
		TotalRecords: totalRecords,
		Limit:        limit,
	}

	start := (pagenum - 1) * limit
	end := min(start+limit, totalRecords)

	if start >= totalRecords {
		history.History = []domain.Download{}
	} else {
		history.History = history.History[start:end]
	}

	for i := range history.History {
		u := &history.History[i]

		if u.UserId == nil || *u.UserId == "" {
			continue
		}

		user := domain.User{}
		if err := s.userRepo.FindById(*u.UserId, &user); err == nil {
			u.Downloader = &domain.Downloader{
				Username: user.Username,
				Email:    user.Email,
			}
		}
	}

	return history, nil
}

func (s *fileService) GetFileStats(ctx context.Context, fileID, userID string, userRole string) (*domain.FileStat, *utils.ReturnStatus) {
	file, err := s.fileRepo.GetFileByID(ctx, fileID)
	if err.IsErr() {
		return nil, utils.Response(utils.ErrCodeFileStatNotFound)
	}

	var requester domain.User
	if err := s.userRepo.FindById(userID, &requester); err != nil {
		return nil, err
	}

	isOwner := file.OwnerId != nil && *file.OwnerId == userID
	isAdmin := requester.Role == "admin"

	if file.OwnerId == nil {
		if !isAdmin {
			// Nếu KHÔNG PHẢI ADMIN gọi, báo lỗi không có quyền (hoặc không tìm thấy tùy bạn thiết kế)
			return nil, utils.Response(utils.ErrCodeStatForbidden)
		}
		// Nếu là Admin, bỏ qua block này để đi tiếp xuống dưới lấy stats!
	} else {
		// Nếu file CÓ chủ sở hữu, người yêu cầu bắt buộc phải là Owner hoặc Admin[cite: 6]
		if !isAdmin && !isOwner {
			return nil, utils.Response(utils.ErrCodeStatForbidden)
		}
	}

	return s.fileRepo.GetFileStats(ctx, fileID)
}

func (s *fileService) GetAccessibleFiles(ctx context.Context, userID string, search string) ([]dto.AccessibleFile, *utils.ReturnStatus) {
	// Truyền thêm tham số search vào Repo
	files, err := s.fileRepo.GetAccessibleFiles(ctx, userID, search)

	if err != nil {
		return nil, err
	}

	var out []dto.AccessibleFile

	for _, file := range files {
		var user domain.User
		var email *string

		if file.OwnerId != nil {
			if err := s.userRepo.FindById(*file.OwnerId, &user); err != nil {
				return nil, err
			}
			email = &user.Email
		}

		out = append(out, dto.AccessibleFile{
			FileId:      file.Id,
			FileName:    file.FileName,
			OwnerEmail:  email,
			HasPassword: file.HasPassword,
			ShareToken:  file.ShareToken,
		})
	}

	return out, nil
}
///////////////////////////////////////////
func (s *fileService) ShareFileWithUsers(ctx context.Context, fileID string, ownerID string, emails []string) *utils.ReturnStatus {
    // 1. Kiểm tra file có tồn tại không
    file, err := s.fileRepo.GetFileByID(ctx, fileID)
    if err != nil || file == nil {
        return utils.Response(utils.ErrCodeFileNotFound)
    }

    // 2. Kiểm tra xem người gọi API có phải là Chủ sở hữu (Owner) của file không
    if file.OwnerId == nil || *file.OwnerId != ownerID {
        return utils.Response(utils.ErrCodeGetForbidden)
    }

    // 3. Gọi trực tiếp hàm gốc trong sharedRepo của Thắng!
    return s.sharedRepo.ShareFileWithUsers(ctx, fileID, emails)
}
