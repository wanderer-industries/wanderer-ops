defmodule WandererOps.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  require Logger

  @impl true
  def start(_type, _args) do
    prepare_application_environment()

    Logger.info(
      "Starting WandererOps application v#{Application.spec(:wanderer_ops, :vsn) || "dev"} in #{get_env()} mode"
    )

    case initialize_services() do
      {:ok, children} ->
        case Supervisor.start_link(children,
               strategy: :one_for_one,
               name: WandererOps.Supervisor
             ) do
          {:ok, _pid} = result ->
            try do
              WandererOps.Application.Initialization.ServiceInitializer.post_startup_initialization()
              result
            rescue
              exception ->
                Logger.error("Post-startup initialization failed",
                  type: "exception",
                  error: inspect(exception),
                  category: :startup
                )

                result
            catch
              :exit, reason ->
                Logger.error("Post-startup initialization failed",
                  type: "exit",
                  error: inspect(reason),
                  category: :startup
                )

                result
            end

          error ->
            Logger.error("Failed to start supervisor",
              error: inspect(error),
              category: :startup
            )

            error
        end

      {:error, reason} = error ->
        log_startup_error(reason)
        error
    end

    # children = [
    # {DNSCluster, query: Application.get_env(:wanderer_ops, :dns_cluster_query) || :ignore},
    # {Phoenix.PubSub, name: WandererOps.PubSub},
    # Start the Finch HTTP client for sending emails
    # {Finch, name: WandererOps.Finch},
    # Supervisor.child_spec({Cachex, name: :tracked_characters},
    #   id: :tracked_characters_cache_worker
    # ),
    # {Registry, keys: :unique, name: WandererOps.MapRegistry},
    # {PartitionSupervisor,
    #  child_spec: DynamicSupervisor, name: WandererOps.Map.DynamicSupervisors},
    # Supervisor.child_spec({Cachex, name: :maps_cache},
    #   id: :maps_cache_worker
    # ),
    # Supervisor.child_spec({Cachex, name: :system_static_info_cache},
    #   id: :system_static_info_cache_worker
    # ),
    # WandererOps.CachedInfo,
    # WandererOps.Map.Manager,
    # Start a worker by calling: WandererOps.Worker.start_link(arg)
    # {WandererOps.Worker, arg},
    # Start to serve requests, typically the last entry
    # WandererOpsWeb.Endpoint
    # ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    # opts = [strategy: :one_for_one, name: WandererOps.Supervisor]
    # Supervisor.start_link(children, opts)
  end

  defp initialize_services do
    WandererOps.Application.Initialization.ServiceInitializer.initialize_services()
  end

  defp log_startup_error(reason) do
    Logger.error("Failed to initialize services",
      error: inspect(reason),
      category: :startup
    )
  end

  # ──────────────────────────────────────────────────────────────────────────────
  # Application Environment Preparation
  # ──────────────────────────────────────────────────────────────────────────────

  defp prepare_application_environment do
    # Ensure critical configuration exists to prevent startup failures
    ensure_critical_configuration()

    # Set application start time for uptime calculation
    Application.put_env(:wanderer_ops, :start_time, System.monotonic_time(:second))

    # Validate configuration on startup
    validate_configuration()

    # Log environment and configuration for debugging
    # log_environment_variables()

    # Logger.debug("Application environment prepared successfully")
  end

  # Validates critical configuration on startup
  defp validate_configuration do
    # Logger.debug("Configuration validation: PASSED")
    :ok
  end

  # Ensures critical configuration exists to prevent startup failures
  defp ensure_critical_configuration do
    # Ensure config_module is set
    if Application.get_env(:wanderer_ops, :config_module) == nil do
      Application.put_env(:wanderer_ops, :config_module, WandererOps.Shared.Config)
    end

    # Ensure features is set
    if Application.get_env(:wanderer_ops, :features) == nil do
      Application.put_env(:wanderer_ops, :features, [])
    end

    # Ensure schedulers are enabled
    if Application.get_env(:wanderer_ops, :schedulers_enabled) == nil do
      Application.put_env(:wanderer_ops, :schedulers_enabled, true)
    end

    # Ensure cache name is set
    if Application.get_env(:wanderer_ops, :cache_name) == nil do
      Application.put_env(
        :wanderer_ops,
        :cache_name,
        WandererOps.Infrastructure.Cache.default_cache_name()
      )
    end

    # We'll validate this later when CommandRegistrar actually tries to register commands
  end

  @doc """
  Gets the current environment.
  """
  def get_env do
    Application.get_env(:wanderer_ops, :env, :dev)
  end

  @doc """
  Gets a configuration value for the given key.
  """
  def get_config(key, default \\ nil) do
    Application.get_env(:wanderer_ops, key, default)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    WandererOpsWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  @doc """
  Reloads modules.
  """
  def reload(modules) do
    if get_env() == :prod do
      {:error, :not_allowed_in_production}
    else
      Logger.debug("Reloading modules")

      # Save current compiler options
      original_compiler_options = Code.compiler_options()

      # Set ignore_module_conflict to true
      Code.compiler_options(ignore_module_conflict: true)

      try do
        Enum.each(modules, fn module ->
          :code.purge(module)
          :code.delete(module)
          :code.load_file(module)
        end)

        Logger.debug("Module reload complete")
        {:ok, modules}
      rescue
        error ->
          Logger.error("Error reloading modules", category: :config, error: inspect(error))

          {:error, error}
      after
        # Restore original compiler options
        Code.compiler_options(original_compiler_options)
      end
    end
  end
end
