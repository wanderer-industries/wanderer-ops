defmodule WandererOps.Map.SSESupervisor do
  @moduledoc """
  Supervisor for SSE client processes.

  This supervisor manages the lifecycle of SSE clients for different maps,
  providing fault tolerance and restart capabilities.
  """

  use Supervisor, restart: :transient
  require Logger

  alias WandererOps.Map.SSEClient

  @doc """
  Starts the SSE supervisor.
  """
  @spec start_link(keyword()) :: Supervisor.on_start()
  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts)
  end

  @impl Supervisor
  def init(opts) do
    children = [
      {WandererOps.Map.SSEClient, opts}
    ]

    Supervisor.init(children, strategy: :one_for_one, auto_shutdown: :any_significant)
  end
end
