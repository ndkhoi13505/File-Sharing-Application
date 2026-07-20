package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/handlers"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/middleware"
)

type FileRoutes struct {
	handler *handlers.FileHandler
}

func NewFileRoutes(handler *handlers.FileHandler) *FileRoutes {
	return &FileRoutes{
		handler: handler,
	}
}

func (fr *FileRoutes) Register(r *gin.RouterGroup) {
	files := r.Group("/files")
	optional := files.Group("/")
	optional.Use(middleware.AuthMiddlewareUpload())
	{
		optional.POST("/upload", fr.handler.UploadFile)

		optional.GET("/:shareToken", fr.handler.GetFileInfo)

		optional.GET("/:shareToken/preview", fr.handler.PreviewFile)
		optional.GET("/:shareToken/download", fr.handler.DownloadFile)
	}
	protected := files.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/available", fr.handler.GetAccessibleFiles)

		protected.GET("/my", fr.handler.GetMyFiles)

		// Sử dụng ID.
		protected.DELETE("/info/:id", fr.handler.DeleteFile)
		protected.GET("/info/:id", fr.handler.GetFileInfoVerbose)
		protected.GET("/stats/:id", fr.handler.GetFileStats)
		protected.GET("/download-history/:id", fr.handler.GetFileDownloadHistory)
	}
}
