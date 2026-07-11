package app

import (
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/handlers"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/routes"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/jwt"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/repository"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/service"
)

type AuthModule struct {
	routes routes.Route
}

func NewAuthModule(ctx *ModuleContext, tokenService jwt.TokenService) *AuthModule {
	userRepository := repository.NewSQLUserRepository(ctx.DB)
	authRepository := repository.NewAuthRepository(ctx.DB)
	authService := service.NewAuthService(userRepository, authRepository, tokenService)
	authHandler := handlers.NewAuthHandler(authService)
	authRoutes := routes.NewAuthRoutes(authHandler)
	return &AuthModule{routes: authRoutes}
}

func (m *AuthModule) Routes() routes.Route {
	return m.routes
}
