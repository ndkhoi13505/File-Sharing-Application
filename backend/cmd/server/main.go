package main

import (
	"github.com/joho/godotenv"
	"github.com/ndkhoi13505/File-Sharing-Application/config"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/app"
)

func main() {
	_ = godotenv.Load()
	cfg := config.NewConfig()
	application := app.NewApplication(cfg)
	application.Run()
}
