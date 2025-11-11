defmodule WandererOpsWeb.BasicAuth do
  @moduledoc false

  def admin_basic_auth(conn, _opts) do
    admin_password = WandererOps.Env.admin_password()

    if is_nil(admin_password) do
      conn
    else
      conn
      |> Plug.BasicAuth.basic_auth(
        username: WandererOps.Env.admin_username(),
        password: admin_password
      )
    end
  end
end
