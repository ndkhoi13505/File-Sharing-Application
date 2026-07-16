package routes

import (
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/handlers"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/middleware"
	"github.com/gin-gonic/gin"
)

type AuthRoutes struct {
	handler *handlers.AuthHandler
}

func NewAuthRoutes(handler *handlers.AuthHandler) *AuthRoutes {
	return &AuthRoutes{
		handler: handler,
	}
}

func (ur *AuthRoutes) Register(r *gin.RouterGroup) {
	auth := r.Group("/auth")
	{
		auth.POST("/register", ur.handler.CreateUser)
		auth.POST("/login", ur.handler.Login)
		auth.POST("/login/totp", ur.handler.LoginTOTP)
	}
	protected := auth.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.POST("/password/change", ur.handler.ChangePassword)
		protected.POST("/totp/setup", ur.handler.SetupTOTP)
		protected.POST("/totp/verify", ur.handler.VerifyTOTP)
		protected.POST("/totp/disable", ur.handler.DisableTOTP)
		protected.POST("/logout", ur.handler.Logout)
	}
}
