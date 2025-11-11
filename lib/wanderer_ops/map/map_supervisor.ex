defmodule WandererOps.Map.MapSupervisor do
  @moduledoc """
  Supervisor for SSE client processes.

  This supervisor manages the lifecycle of SSE clients for different maps,
  providing fault tolerance and restart capabilities.
  """

  use Supervisor, restart: :transient
  require Logger

  alias WandererOps.Map.{ServerSupervisor, SSESupervisor}

  @doc """
  Starts the SSE supervisor.
  """
  @spec start_link(keyword()) :: Supervisor.on_start()
  def start_link(opts) do
    map_id = opts[:map_id]
    name = via(map_id)
    Supervisor.start_link(__MODULE__, opts, name: name)
  end

  @impl Supervisor
  def init(opts) do
    children = [
      %{
        id: {:map_server, opts[:map_id]},
        start: {ServerSupervisor, :start_link, [opts]},
        restart: :transient
      },
      %{
        id: {:sse_client, opts[:map_id]},
        start: {SSESupervisor, :start_link, [opts]},
        restart: :transient,
        shutdown: 5000
      }
    ]

    # Start with empty children, we'll dynamically add SSE clients
    # when the application starts or when SSE is enabled
    Supervisor.init(children, strategy: :one_for_one)
  end

  # Private helper functions

  defp via(map_id), do: {:via, Registry, {WandererOps.MapRegistry, {:map_supervisor, map_id}}}
end
