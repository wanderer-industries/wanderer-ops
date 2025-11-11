defmodule WandererOpsWeb.Router do
  use WandererOpsWeb, :router

  import WandererOpsWeb.BasicAuth,
    warn: false,
    only: [admin_basic_auth: 2]

  pipeline :admin_bauth do
    plug :admin_basic_auth
  end

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {WandererOpsWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :landing do
    plug(:put_layout, html: {WandererOpsWeb.Layouts, :landing})
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  # scope "/", WandererOpsWeb do
  #   pipe_through [:browser, :landing]

  #   get "/", PageController, :welcome
  # end

  scope "/", WandererOpsWeb do
    pipe_through :browser
    pipe_through :admin_bauth

    live "/", DashboardLive, :index
    live "/create", DashboardLive, :create
    live "/edit/:id", DashboardLive, :edit
  end

  # Other scopes may use custom stacks.
  # scope "/api", WandererOpsWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:wanderer_ops, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: WandererOpsWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end

  if Mix.env() == :dev do
    scope "/" do
      pipe_through :browser
    end
  end
end
