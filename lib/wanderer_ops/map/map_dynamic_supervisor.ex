defmodule WandererOps.Map.DynamicSupervisor do
  @moduledoc """
  Dynamically starts a map server
  """

  use DynamicSupervisor

  require Logger

  alias WandererOps.Map.Server

  def start_link(_arg) do
    IO.puts("Starting map dynamic supervisor start_link")
    DynamicSupervisor.start_link(__MODULE__, nil, name: __MODULE__)
  end

  def init(nil) do
    IO.puts("Starting map dynamic supervisor")
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start(map_id) do
    child_spec = %{
      id: Server,
      start: {Server, :start_link, [map_id]},
      restart: :transient
    }

    case DynamicSupervisor.start_child(__MODULE__, child_spec) do
      {:ok, _} ->
        :ok

      {:error, {:already_started, _}} ->
        :ok

      {:error, reason} ->
        {:error, reason}
    end
  end

  def which_children do
    Supervisor.which_children(__MODULE__)
  end
end
