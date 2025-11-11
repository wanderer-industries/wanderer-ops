defmodule WandererOps.Application.Initialization.ServiceInitializer do
  @moduledoc """
  Unified service initialization coordinator.

  This module manages the startup sequence of all application services,
  ensuring proper dependency ordering and error handling during initialization.

  ## Initialization Phases

  1. **Infrastructure Phase**: Core infrastructure (cache, registries, PubSub)
  2. **Foundation Phase**: Basic services (ApplicationService, LicenseService)
  3. **Integration Phase**: External integrations (Discord, HTTP clients)
  4. **Processing Phase**: Business logic services (Killmail, SSE, Schedulers)
  5. **Finalization Phase**: Post-startup initialization (SSE clients, metrics)
  """

  require Logger
  alias WandererOps.Shared.Utils.Retry

  @maps_shared_cache_name :maps_shared_cache

  @type initialization_phase ::
          :infrastructure | :foundation | :integration | :processing | :finalization
  @type service_spec :: Supervisor.child_spec() | {module(), term()}
  @type service_config :: %{
          phase: initialization_phase(),
          dependencies: [atom()],
          required: boolean(),
          timeout: pos_integer(),
          async_init: boolean()
        }

  # ──────────────────────────────────────────────────────────────────────────────
  # Public API
  # ──────────────────────────────────────────────────────────────────────────────

  @doc """
  Initializes all application services in the correct order.
  """
  @spec initialize_services() :: {:ok, [Supervisor.child_spec()]} | {:error, term()}
  def initialize_services do
    start_time = System.monotonic_time(:millisecond)
    Logger.info("Starting service initialization", category: :startup)

    try do
      case build_service_tree() do
        {:ok, services} ->
          duration = System.monotonic_time(:millisecond) - start_time

          Logger.info("Service initialization completed successfully in #{duration}ms",
            services_count: length(services),
            category: :startup
          )

          {:ok, services}
      end
    rescue
      error ->
        reason = {:service_tree_build_failed, error}

        Logger.error("Service initialization failed",
          error: inspect(reason),
          category: :startup
        )

        {:error, reason}
    end
  end

  @doc """
  Performs post-startup initialization tasks asynchronously.
  """
  @spec post_startup_initialization() :: :ok
  def post_startup_initialization do
    Logger.info("Starting post-startup initialization (async)", category: :startup)

    # Start finalization phase in a supervised task
    Task.Supervisor.start_child(WandererOps.TaskSupervisor, fn ->
      finalization_phase()
    end)

    :ok
  end

  # ──────────────────────────────────────────────────────────────────────────────
  # Service Tree Building
  # ──────────────────────────────────────────────────────────────────────────────

  defp build_service_tree do
    # Let any exceptions bubble up naturally - they'll be caught by the caller
    services =
      infrastructure_phase() ++
        foundation_phase() ++
        integration_phase() ++
        processing_phase()

    {:ok, services}
  end

  # ──────────────────────────────────────────────────────────────────────────────
  # Initialization Phases
  # ──────────────────────────────────────────────────────────────────────────────

  defp infrastructure_phase do
    Logger.debug("Initializing infrastructure phase")

    create_cache_child_spec() ++
      [
        WandererOpsWeb.Telemetry,
        WandererOps.Repo,
        # Task supervisor must be first for async initialization
        {Task.Supervisor, name: WandererOps.TaskSupervisor},
        {Finch, name: WandererOps.Finch},

        # Registry for process naming
        {Registry, keys: :unique, name: WandererOps.MapRegistry},

        # Rate limiting for external services
        {WandererOps.Infrastructure.RateLimiter, []},

        # Phoenix PubSub for internal communication
        {Phoenix.PubSub, name: WandererOps.PubSub}
      ]
  end

  defp foundation_phase do
    Logger.debug("Initializing foundation phase")

    [
      {PartitionSupervisor,
       child_spec: DynamicSupervisor, name: WandererOps.Map.DynamicSupervisors},

      # Core application service (simplified)
      {WandererOps.Application.Services.ApplicationCoordinator, []},

      # License management
      {WandererOps.Domains.License.LicenseService, []}
    ]
  end

  defp integration_phase do
    Logger.debug("Initializing integration phase")

    base_integrations = [
      # Phoenix web endpoint
      WandererOpsWeb.Endpoint
    ]

    # Add real-time integration if not in test environment
    if Application.get_env(:wanderer_ops, :env) != :test do
      base_integrations ++
        [
          {WandererOps.Infrastructure.Messaging.ConnectionMonitor, []}
        ]
    else
      base_integrations
    end
  end

  defp processing_phase do
    Logger.debug("Initializing processing phase")

    [
      WandererOps.Map.Manager

      # SSE clients for map tracking
      # {WandererOps.Map.SSESupervisor, []},

      # Background schedulers
      # {WandererOps.Application.Supervisors.Schedulers.Supervisor, []}
    ]
  end

  defp finalization_phase do
    start_time = System.monotonic_time(:millisecond)
    Logger.debug("Starting finalization phase")

    # Wait for core services to be ready
    wait_for_service_readiness()

    duration = System.monotonic_time(:millisecond) - start_time
    Logger.info("Finalization phase completed in #{duration}ms", category: :startup)
  end

  # ──────────────────────────────────────────────────────────────────────────────
  # Service Readiness and Health Checks
  # ──────────────────────────────────────────────────────────────────────────────

  defp wait_for_service_readiness do
    critical_services = [
      WandererOps.Application.Services.ApplicationCoordinator
      # WandererOps.Map.SSESupervisor
    ]

    Enum.each(critical_services, &wait_for_service/1)
  end

  # Maximum wait time is approximately 50 seconds based on max_attempts (50) and backoff duration
  # Backoff starts at 10ms and exponentially increases up to 1000ms per attempt
  defp wait_for_service(service_module) do
    result =
      Retry.run(
        fn ->
          case Process.whereis(service_module) do
            nil -> {:error, :service_not_started}
            pid when is_pid(pid) -> {:ok, pid}
          end
        end,
        max_attempts: 50,
        base_backoff: 10,
        max_backoff: 1_000,
        jitter: false,
        context: "Waiting for #{inspect(service_module)}",
        retryable_errors: [:service_not_started]
      )

    case result do
      {:ok, _pid} ->
        :ok

      {:error, :service_not_started} ->
        raise "Service #{service_module} failed to start after 50 attempts"
    end
  end

  # ──────────────────────────────────────────────────────────────────────────────
  # Specific Initialization Tasks
  # ──────────────────────────────────────────────────────────────────────────────

  defp initialize_cache_monitoring do
    Logger.debug("Initializing cache monitoring")
    # Cache monitoring has been simplified - no action needed
    :ok
  end

  # ──────────────────────────────────────────────────────────────────────────────
  # Helper Functions
  # ──────────────────────────────────────────────────────────────────────────────

  defp create_cache_child_spec do
    cache_name = WandererOps.Infrastructure.Cache.cache_name()
    cache_opts = [stats: true]

    [
      {Cachex, [name: cache_name] ++ cache_opts},
      Supervisor.child_spec({Cachex, name: @maps_shared_cache_name, stats: true},
        id: :maps_shared_cache_worker
      ),
      Supervisor.child_spec({Cachex, name: :maps_cache, stats: true},
        id: :maps_cache_worker
      ),
      Supervisor.child_spec({Cachex, name: :maps_all_data_cache, stats: true},
        id: :maps_all_data_cache_worker
      ),
      Supervisor.child_spec({Cachex, name: :system_static_info_cache, stats: true},
        id: :system_static_info_cache_worker
      ),
      WandererOps.CachedInfo
    ]
  end
end
