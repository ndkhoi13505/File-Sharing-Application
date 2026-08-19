package app

import (
	"github.com/ndkhoi13505/File-Sharing-Application/config"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/handlers"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/routes"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/storage"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/repository"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/service"
)

type adminModule struct {
	routes routes.Route
}

func NewAdminModule(
	cfg *config.Config,
	fileRepo repository.FileRepository,
	storageService storage.Storage,
) Module {

	adminService := service.NewAdminService(cfg, fileRepo, storageService)
	adminHandler := handlers.NewAdminHandler(adminService)
	adminRoutes := routes.NewAdminRoutes(adminHandler)

	return &adminModule{
		routes: adminRoutes,
	}
}

func (m *adminModule) Routes() routes.Route {
	return m.routes
}
