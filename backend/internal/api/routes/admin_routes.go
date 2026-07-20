package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/handlers"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/middleware"
)

type AdminRoutes struct {
	handler *handlers.AdminHandler
}

func NewAdminRoutes(handler *handlers.AdminHandler) *AdminRoutes {
	return &AdminRoutes{
		handler: handler,
	}
}

func (ar *AdminRoutes) Register(r *gin.RouterGroup) {
	r.GET("/admin/policy", ar.handler.GetSystemPolicy)
	admin := r.Group("/admin")
	{
		admin.Use(middleware.AuthMiddleware())
		admin.Use(middleware.AdminAuthMiddleware())

		admin.PATCH("/policy", ar.handler.UpdateSystemPolicy)
		admin.POST("/cleanup", ar.handler.CleanupExpiredFiles)
		admin.GET("/files", ar.handler.GetAllFiles)
	}
}
