package service

import (
	"context"
	"log"
	"time"

	"github.com/ndkhoi13505/File-Sharing-Application/config"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/storage"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/repository"
	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/domain"
	"github.com/gin-gonic/gin"
)

type adminService struct {
	cfg			*config.Config
	fileRepo	repository.FileRepository
	storage		storage.Storage
}

func NewAdminService(cfg *config.Config, fr repository.FileRepository, s storage.Storage) AdminService {
	return &adminService{
		cfg:		cfg,
		fileRepo:	fr,
		storage:	s,
	}
}

func (s *adminService) GetSystemPolicy(ctx context.Context) (*config.SystemPolicy, *utils.ReturnStatus) {
	return s.cfg.Policy, nil
}

func toInt(value any) (int, bool) {
	if value == nil {
		return 0, false
	}
	switch v := value.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	case int64:
		return int(v), true
	default:
		return 0, false
	}
}

func (s *adminService) UpdateSystemPolicy(ctx context.Context, updates map[string]any) (*config.SystemPolicy, *utils.ReturnStatus) {

	currentPolicy := *s.cfg.Policy

	// 1. MaxFileSizeMB
	if val, exists := updates[utils.CamelToSnake("MaxFileSizeMB")]; exists {
		if v, ok := toInt(val); ok {
			if v <= 0 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Max file size must be > 0")
			}
			if v > 10240 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Max file size cannot exceed 10GB (10240 MB)")
			}
			currentPolicy.MaxFileSizeMB = v
		}
	}

	// 2. MinValidityHours
	if val, exists := updates[utils.CamelToSnake("MinValidityHours")]; exists {
		if v, ok := toInt(val); ok {
			if v < 0 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Min validity hours cannot be negative")
			}
			if v > 8760 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Min validity hours cannot exceed 1 year")
			}
			currentPolicy.MinValidityHours = v
		}
	}

	// 3. MaxValidityDays
	if val, exists := updates[utils.CamelToSnake("MaxValidityDays")]; exists {
		if v, ok := toInt(val); ok {
			if v <= 0 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Max validity days must be > 0")
			}
			if v > 3650 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Max validity days cannot exceed 10 years")
			}
			currentPolicy.MaxValidityDays = v
		}
	}

	// 4. DefaultValidityDays
	if val, exists := updates[utils.CamelToSnake("DefaultValidityDays")]; exists {
		if v, ok := toInt(val); ok {
			if v <= 0 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Default validity days must be > 0")
			}
			currentPolicy.DefaultValidityDays = v
		}
	}

	// 5. RequirePasswordMinLength
	if val, exists := updates[utils.CamelToSnake("RequirePasswordMinLength")]; exists {
		if v, ok := toInt(val); ok {
			if v < 0 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Password length cannot be negative")
			}
			if v > 128 {
				return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Password min length cannot exceed 128 characters")
			}
			currentPolicy.RequirePasswordMinLength = v
		}
	}

	if currentPolicy.DefaultValidityDays > currentPolicy.MaxValidityDays {
		return nil, utils.ResponseMsg(utils.ErrCodeBadRequest, "Default validity days cannot be greater than max validity days")
	}

	*s.cfg.Policy = currentPolicy

	return s.cfg.Policy, nil
}

func (s *adminService) CleanupExpiredFiles(ctx context.Context) (int, *utils.ReturnStatus) {
	files, err := s.fileRepo.FindAll(ctx)
	if err.IsErr() {
		return 0, err
	}

	now := time.Now().UTC()
	deletedCount := 0

	// Duyệt qua tất cả các file
	for _, file := range files {
		// 1. Kiểm tra ngày hết hạn
		if file.AvailableTo.Before(now) {

			if err := s.storage.DeleteFile(file.Id); err.IsErr() {
				// Log lỗi nhưng tiếp tục sang file tiếp theo
				log.Printf("Cleanup Error: Failed to delete physical file %s: %v, ignoring...", file.Id, err)
				continue
			}

			if err := s.fileRepo.DeleteFile(ctx, file.Id); err.IsErr() {
				// Log lỗi nhưng tiếp tục sang file tiếp theo
				log.Printf("Cleanup Error: Failed to delete metadata for file %s: %v, ignoring...", file.Id, err)
				continue
			}

			deletedCount++
		}
	}

	return deletedCount, nil
}

func (s *adminService) GetAllFiles(ctx context.Context, params domain.ListFileParams) (interface{}, *utils.ReturnStatus) {
	files, totalFiles, err := s.fileRepo.GetAllFiles(ctx, params)
	if err.IsErr() {
		return nil, err
	}

	totalPages := 0
	if params.Limit > 0 {
		totalPages = (totalFiles + params.Limit - 1) / params.Limit
	}

	pagination := gin.H{
		"currentPage":	params.Page,
		"totalPages":	totalPages,
		"totalFiles":	totalFiles,
		"limit":		params.Limit,
	}

	out := []gin.H{}
	for _, f := range files {
		out = append(out, gin.H{
			"id":				f.Id,
			"fileName":			f.FileName,
			"mimeType":			f.MimeType,
			"fileSize":			f.FileSize,
			"shareToken":		f.ShareToken,
			"ownerId":			f.OwnerId,
			"isPublic":			f.IsPublic,
			"status":			f.Status,
			"availableFrom":	f.AvailableFrom,
			"availableTo":		f.AvailableTo,
			"createdAt":		f.CreatedAt,
		})
	}

	return gin.H{
		"files":      out,
		"pagination": pagination,
	}, nil
}
