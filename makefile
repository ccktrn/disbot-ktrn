# makefile
.DEFAULT_GOAL := help
.PHONY : help
help:   # show this list
	@echo "---- list of available commands ---"
	@grep -E '^[[:alnum:]_/-]+ *:.*?#.*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?# "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
# ----


.PHONY : up down check
up:   # run the application
	@docker compose -f docker-compose.yml -f docker-compose.dev.yml up
down :   # stop the application
	@docker compose down
check:   # check the typescript code
	@bunx tsc --noEmit

.PHONY : deploy build clean

deploy:   # deploy the application
	@docker compose up -d
build:   # build the application
	@docker compose build
clean:   # clean the application
	@docker compose down --rmi all --volumes --remove-orphans
	