package handlers

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/dto"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/domain"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/jwt"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/service"
	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
	"github.com/ndkhoi13505/File-Sharing-Application/pkg/validation"
)

type FileHandler struct {
	file_service service.FileService
}
///////////////////////////////////////////////
type ShareFileRequest struct {
	UserIDs []string `json:"sharedWith" binding:"required"`
}
//////////////////////////////////////////////
func NewFileHandler(file_service service.FileService) *FileHandler {
	return &FileHandler{
		file_service: file_service,
	}
}

func (fh *FileHandler) UploadFile(ctx *gin.Context) {
	var req dto.UploadRequest

	fileHeader, err := ctx.FormFile("file")
	if err != nil {
		utils.Response(utils.ErrCodeFileUploadRequired).Export(ctx)
		return
	}

	req.FileNameForValidation = fileHeader.Filename

	if err := ctx.ShouldBind(&req); err != nil {
		utils.ResponseValidator(ctx, validation.HandleValidationErrors(err))
		return
	}

	// 🌟 1. ĐỌC TRỰC TIẾP VALIDITYDAYS TỪ MULTIPART FORM-DATA VÀ GÁN VÀO DTO
	if validityDaysStr := ctx.PostForm("validityDays"); validityDaysStr != "" {
		if days, err := strconv.Atoi(validityDaysStr); err == nil {
			req.ValidityDays = days
		}
	}

	if req.Password != nil {
		if len(*req.Password) < 8 {
			utils.ResponseMsg(utils.ErrCodeBadRequest, "Password must be at least 8 characters long").Export(ctx)
			return
		}
	}

	var userID *string
	if val, exists := ctx.Get("userID"); exists && val != "" {
		strVal := val.(string)
		userID = &strVal
	} else {
		userID = nil
	}

	if userID == nil && (!req.IsPublic || req.SharedWith != nil) {
		utils.Response(utils.ErrCodeFilePrivateNeedsAuth).Export(ctx)
		return
	}

	if req.IsPublic && req.SharedWith != nil {
		utils.Response(utils.ErrCodeFileUploadPublicWithShared).Export(ctx)
		return
	}

	uploadedFile, berr := fh.file_service.UploadFile(ctx, fileHeader, &req, userID)
	if berr != nil {
		berr.Export(ctx)
		return
	}

	response := gin.H{
		"id":         uploadedFile.Id,
		"fileName":   uploadedFile.FileName,
		"shareToken": uploadedFile.ShareToken,
		"isPublic":   uploadedFile.IsPublic,
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"success": true,
		"file":    response,
		"message": "File uploaded successfully",
	})
}

func (fh *FileHandler) DeleteFile(ctx *gin.Context) {
	fileID := ctx.Param("id")

	if uuid.Validate(fileID) != nil {
		utils.ResponseMsg(utils.ErrCodeBadRequest, "Invalid ID provided").Export(ctx)
		return
	}

	userID, exists := ctx.Get("userID")
	if !exists {
		utils.Response(utils.ErrCodeBearerInvalid).Export(ctx)
		return
	}

	err := fh.file_service.DeleteFile(ctx, fileID, userID.(string))

	if err != nil {
		err.Export(ctx)
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "File deleted successfully",
		"fileId":  fileID,
	})
}

func (fh *FileHandler) GetMyFiles(ctx *gin.Context) {
	userID, exists := ctx.Get("userID")
	if !exists {
		utils.Response(utils.ErrCodeBearerInvalid).Export(ctx)
		return
	}

	status := ctx.DefaultQuery("status", "all")
	page := utils.GetIntQuery(ctx, "page", 1)
	limit := utils.GetIntQuery(ctx, "limit", 20)
	sortBy := ctx.DefaultQuery("sortBy", "createdAt")
	order := ctx.DefaultQuery("order", "desc")
	search := ctx.Query("q")

	params := domain.ListFileParams{
		Status: strings.ToLower(status),
		Page:   page,
		Limit:  limit,
		SortBy: sortBy,
		Order:  strings.ToLower(order),
		Search: strings.TrimSpace(search),
	}

	result, err := fh.file_service.GetMyFiles(ctx, userID.(string), params)

	if err != nil {
		err.Export(ctx)
		return
	}

	//utils.ResponseSuccess(ctx, http.StatusOK, "User files retrieved successfully", gin.H{"file": result})
	ctx.JSON(http.StatusOK, result)
}

func (fh *FileHandler) GetFileInfo(ctx *gin.Context) {
	ident := ctx.Param("shareToken")
	userID, exists := ctx.Get("userID")
	if !exists {
		userID = ""
	}

	// 🌟 Đọc mật khẩu từ Query Param (trên URL ?password=...) hoặc Header
    password := ctx.Query("password")
    if password == "" {
        password = ctx.GetHeader("X-File-Password")
    }

	var file *domain.File = nil
	var err *utils.ReturnStatus = nil

	if uuid.Validate(ident) == nil {
		file, _, _, err = fh.file_service.GetFileInfoID(ctx, ident, userID.(string), password, false)
	} else {
		file, _, _, err = fh.file_service.GetFileInfo(ctx, ident, userID.(string), password, false)
	}

	if err != nil {
		err.Export(ctx)
		return
	}

	out := gin.H{
		"id":          file.Id,
		"fileName":    file.FileName,
		"shareToken":  file.ShareToken,
		"status":      file.Status,
		"isPublic":    file.IsPublic,
		"hasPassword": file.HasPassword,
		"fileSize":    file.FileSize,
		"mimeType":    file.MimeType,
	}

	//utils.ResponseSuccess(ctx, http.StatusOK, "File retrieved successfully", gin.H{"file": result})
	ctx.JSON(http.StatusOK, gin.H{
		"file": out,
	})
}

func (fh *FileHandler) GetFileInfoVerbose(ctx *gin.Context) {
	ident := ctx.Param("id")
	userID, exists := ctx.Get("userID")
	if !exists {
		utils.Response(utils.ErrCodeBearerInvalid).Export(ctx)
		return
	}

	var file *domain.File = nil
	var owner *domain.User = nil
	var err *utils.ReturnStatus = nil
	shared := []string{}

	if uuid.Validate(ident) == nil {
		file, owner, shared, err = fh.file_service.GetFileInfoID(ctx, ident, userID.(string), "", true)
	} else {
		file, owner, shared, err = fh.file_service.GetFileInfo(ctx, ident, userID.(string), "", true)
	}

	if err != nil {
		err.Export(ctx)
		return
	}

	out := gin.H{
		"id":          file.Id,
		"fileName":    file.FileName,
		"fileSize":    file.FileSize,
		"mimeType":    file.MimeType,
		"shareToken":  file.ShareToken,
		"shareLink":   fmt.Sprintf("http://localhost:8080/files/%s", file.ShareToken),
		"isPublic":    file.IsPublic,
		"hasPassword": file.HasPassword,

		"availableFrom": file.AvailableFrom,
		"availableTo":   file.AvailableTo,
		"status":        file.Status,

		"hoursRemaining": file.AvailableTo.Sub(file.AvailableFrom).Hours(),

		"createdAt": file.CreatedAt,
	}

	if owner != nil {
		out["owner"] = gin.H{
			"id":       owner.Id,
			"username": owner.Username,
			"email":    owner.Email,
			"role":     owner.Role,
		}
	} else {
		out["owner"] = nil // Hoặc không gán gì cả để trả về null cho Frontend biết đây là file ẩn danh
	}

	if shared != nil {
		out["sharedWith"] = shared
	}

	//utils.ResponseSuccess(ctx, http.StatusOK, "File retrieved successfully", gin.H{"file": result})
	ctx.JSON(http.StatusOK, gin.H{
		"file": out,
	})
}

func (fh *FileHandler) getFileData(ctx *gin.Context, isDownload bool) (*domain.File, []byte, *utils.ReturnStatus) {
	fmt.Println("\n=================== [HANDLER] GET FILE DATA ===================")

	ident := ctx.Param("shareToken")
	if ident == "" {
		ident = ctx.Param("id")
	}

	userID, exists := ctx.Get("userID")
	if !exists {
		userID = ""
	}

	// 1. LẤY PASSWORD TỪ QUERY PARAM (?password=...) HOẶC HEADER
	password := ctx.Query("password")
	if password == "" {
		password = ctx.GetHeader("X-File-Password")
	}

	fmt.Printf("👉 ShareToken/ID: '%s'\n", ident)
	fmt.Printf("👉 UserID tu JWT: '%v' (exists: %v)\n", userID, exists)
	fmt.Printf("👉 Password doc tu Request: '%s'\n", password)

	var fileInfo *domain.File
	var err *utils.ReturnStatus

	// 2. GỌI SERVICE KIỂM TRA QUYỀN VÀ MẬT KHẨU
	if uuid.Validate(ident) == nil {
		fmt.Println("➡️ Identity la UUID -> Goi GetFileInfoID")
		fileInfo, _, _, err = fh.file_service.GetFileInfoID(ctx, ident, userID.(string), password, false)
	} else {
		fmt.Println("➡️ Identity la ShareToken -> Goi GetFileInfo")
		fileInfo, _, _, err = fh.file_service.GetFileInfo(ctx, ident, userID.(string), password, false)
	}

	if err != nil {
		fmt.Println("❌ LOI TU SERVICE:", err)
		fmt.Println("===============================================================\n")
		return nil, nil, err
	}

	fmt.Printf("✅ SERVICE CAP QUYEN THANH CONG! File Name: '%s'\n", fileInfo.FileName)

	// 3. TẢI/ĐỌC NỘI DUNG FILE
	fileInfo, reader, errDownload := fh.file_service.DownloadFile(ctx, fileInfo.ShareToken, userID.(string), password, isDownload)
	if errDownload != nil {
		fmt.Println("❌ LOI DOWNLOAD FILE:", errDownload)
		fmt.Println("===============================================================\n")
		return nil, nil, errDownload
	}

	// Đọc reader ra byte array
	fileBytes, errRead := io.ReadAll(reader)
	if errRead != nil {
		fmt.Printf("❌ LOI READ ALL READER: %v\n", errRead)
		fmt.Println("===============================================================\n")
		return nil, nil, utils.ResponseMsg(utils.ErrCodeInternal, "Failed to read file content")
	}

	fmt.Printf("🎉 DOC FILE THANH CONG! Dung luong read: %d bytes\n", len(fileBytes))
	fmt.Println("===============================================================\n")

	return fileInfo, fileBytes, nil
}

func (fh *FileHandler) DownloadFile(ctx *gin.Context) {
	info, file, err := fh.getFileData(ctx, true)
	if err != nil {
		err.Export(ctx)
		return
	}

	ctx.Data(http.StatusOK, info.MimeType, file)
}

func (fh *FileHandler) PreviewFile(ctx *gin.Context) {
	info, file, err := fh.getFileData(ctx, false)
	if err != nil {
		err.Export(ctx)
		return
	}

	ctx.Header("Content-Disposition", "inline; filename=\""+info.FileName+"\"")
	ctx.Data(http.StatusOK, info.MimeType, file)
}

func (fh *FileHandler) GetFileDownloadHistory(ctx *gin.Context) {
	fileID := ctx.Param("id")
	userID, exists := ctx.Get("userID")
	if !exists {
		utils.Response(utils.ErrCodeBearerInvalid).Export(ctx)
		return
	}

	page := utils.GetIntQuery(ctx, "page", 1)
	limit := utils.GetIntQuery(ctx, "limit", 20)
	if limit == 0 {
		utils.ResponseError(ctx, utils.NewError("Limit must not be 0", utils.ErrCodeBadRequest))
		return
	}

	history, download_err := fh.file_service.GetFileDownloadHistory(ctx, fileID, userID.(string), page, limit)
	if download_err != nil {
		download_err.Export(ctx)
		return
	}

	ctx.JSON(http.StatusOK, history)
}

func (fh *FileHandler) GetFileStats(ctx *gin.Context) {
	fileID := ctx.Param("id")
	userID, exists := ctx.Get("userID")

	if !exists {
		utils.Response(utils.ErrCodeBearerInvalid).Export(ctx)
		return
	}

	if uuid.Validate(fileID) != nil {
		utils.Response(utils.ErrCodeFileNotFound).Export(ctx)
		return
	}

	userClaims, existsClaims := ctx.Get("user")
	var userRole string = ""
	if existsClaims {
		if claims, ok := userClaims.(*jwt.Claims); ok {
			userRole = claims.Role
		}
	}

	stats, err := fh.file_service.GetFileStats(ctx, fileID, userID.(string), userRole)
	if err != nil {
		err.Export(ctx)
		return
	}

	out := gin.H{
		"fileId":   stats.FileId,
		"fileName": stats.FileName,
		"statistics": gin.H{
			"downloadCount":     stats.TotalDownloadCount,
			"uniqueDownloaders": stats.UserDownloadCount,
			"lastDownloadedAt":  stats.LastDownloadedAt,
			"createdAt":         stats.CreatedAt,
		},
	}

	ctx.JSON(http.StatusOK, out)
}

func (fh *FileHandler) GetAccessibleFiles(ctx *gin.Context) {
	userID, exists := ctx.Get("userID")

	if !exists {
		utils.Response(utils.ErrCodeBearerInvalid).Export(ctx)
		return
	}

	// 1. Lấy từ khóa tìm kiếm từ query param '?q=...' trên URL
	search := ctx.Query("q")

	// 2. Truyền chuỗi search (đã cắt khoảng trắng thừa) vào service
	files, err := fh.file_service.GetAccessibleFiles(ctx, userID.(string), strings.TrimSpace(search))
	if err != nil {
		err.Export(ctx)
		return
	}

	page := utils.GetIntQuery(ctx, "page", 1)
	limit := utils.GetIntQuery(ctx, "limit", 20)
	totalPages := 1

	if len(files) != 0 {
		totalPages = (len(files) + limit) / limit
	}

	if page > totalPages {
		page = totalPages
	}

	start := limit * (page - 1)
	end := min(start+limit, len(files))

	ctx.JSON(http.StatusOK, gin.H{
		"files": files[start:end],
		"pagination": gin.H{
			"currentPage": page,
			"totalPages":  totalPages,
			"totalFiles":  len(files),
			"limit":       limit,
		},
	})
}
//////////////////////////////////////////////
func (fh *FileHandler) ShareFile(ctx *gin.Context) {
	fileID := ctx.Param("id")
	
	var req ShareFileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.ResponseValidator(ctx, validation.HandleValidationErrors(err))
		return
	}

	userID, _ := ctx.Get("userID")

	err := fh.file_service.ShareFileWithUsers(ctx, fileID, userID.(string), req.UserIDs)
	if err != nil {
		err.Export(ctx)
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Chia sẻ file thành công",
	})
}
