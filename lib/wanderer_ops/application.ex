defmodule WandererOps.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      WandererOpsWeb.Telemetry,
      WandererOps.Repo,
      {DNSCluster, query: Application.get_env(:wanderer_ops, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: WandererOps.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: WandererOps.Finch},
      Supervisor.child_spec({Cachex, name: :tracked_characters},
        id: :tracked_characters_cache_worker
      ),
      {Registry, keys: :unique, name: WandererOps.MapRegistry},
      {PartitionSupervisor,
       child_spec: DynamicSupervisor, name: WandererOps.Map.DynamicSupervisors},
      Supervisor.child_spec({Cachex, name: :maps_cache},
        id: :maps_cache_worker
      ),
      Supervisor.child_spec({Cachex, name: :system_static_info_cache},
        id: :system_static_info_cache_worker
      ),
      WandererOps.CachedInfo,
      WandererOps.Map.Manager,
      # Start a worker by calling: WandererOps.Worker.start_link(arg)
      # {WandererOps.Worker, arg},
      # Start to serve requests, typically the last entry
      WandererOpsWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: WandererOps.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    WandererOpsWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
