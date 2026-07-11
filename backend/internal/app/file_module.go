package app

import (
	"github.com/ndkhoi13505/File-Sharing-Application/config"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/handlers"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/api/routes"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/infrastructure/storage"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/repository"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/service"
)

type fileModule struct {
	routes routes.Route
}

func NewFileModule(
	cfg *config.Config,
	fileRepo repository.FileRepository,
	sharedRepo repository.SharedRepository,
	userRepo repository.UserRepository,
	storageService storage.Storage,
) Module {
	fileService := service.NewFileService(cfg, fileRepo, sharedRepo, userRepo, storageService)
	fileHandler := handlers.NewFileHandler(fileService)
	fileRoutes := routes.NewFileRoutes(fileHandler)

	return &fileModule{
		routes: fileRoutes,
	}
}

func (m *fileModule) Routes() routes.Route {
	return m.routes
}
