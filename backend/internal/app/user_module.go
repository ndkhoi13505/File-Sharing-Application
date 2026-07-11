package app

import (
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/handlers"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/routes"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/repository"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/service"
)

type UserModule struct {
	routes routes.Route
}

func NewUserModule(ctx *ModuleContext) *UserModule {
	userRepository := repository.NewSQLUserRepository(ctx.DB)
	userService := service.NewUserService(userRepository)
	userHandler := handlers.NewUserHandler(userService)
	userRoutes := routes.NewUserRoutes(userHandler)
	return &UserModule{routes: userRoutes}
}

func (m *UserModule) Routes() routes.Route {
	return m.routes
}
