// file: internal/app/admin_module.go (Mới)
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

// Cần thêm các tham số FileRepo và Storage để hỗ trợ Cleanup
func NewAdminModule(
	cfg *config.Config,
	fileRepo repository.FileRepository, // <-- THÊM
	storageService storage.Storage, // <-- THÊM
) Module {

	// Policy tĩnh: không cần Repository
	adminService := service.NewAdminService(cfg, fileRepo, storageService) // <-- CẬP NHẬT
	adminHandler := handlers.NewAdminHandler(adminService)
	adminRoutes := routes.NewAdminRoutes(adminHandler)

	return &adminModule{
		routes: adminRoutes,
	}
}

func (m *adminModule) Routes() routes.Route {
	return m.routes
}
