# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :spark, formatter: ["Ash.Resource": [section_order: [:authentication, :tokens]]]

config :wanderer_ops,
  ecto_repos: [WandererOps.Repo],
  ash_domains: [WandererOps.Api],
  generators: [timestamp_type: :utc_datetime],
  pubsub_client: Phoenix.PubSub

# Configures the endpoint
config :wanderer_ops, WandererOpsWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: WandererOpsWeb.ErrorHTML, json: WandererOpsWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: WandererOps.PubSub,
  live_view: [signing_salt: "ycJU4EEA"]

# Configure cache settings
config :wanderer_ops,
  cache_name: :wanderer_ops_cache,
  cache_size_limit: 10_000,
  cache_stats_enabled: true

# Configure service modules with standardized behavior implementations
config :wanderer_ops,
  config_module: WandererOps.Shared.Config

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :wanderer_ops, WandererOps.Mailer, adapter: Swoosh.Adapters.Local

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:application, :module, :function, :line, :request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Configure Hammer rate limiting
config :hammer,
  backend: {Hammer.Backend.ETS, [expiry_ms: 60_000 * 60 * 2, cleanup_interval_ms: 60_000 * 10]}

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
