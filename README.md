# WandererOps

To start your server:

  * Run `nix develop`
  * Run `pg-start` to start DB server
  * Run `make s` to start dev server

Now you can visit [`localhost:4001`](http://localhost:4001) from your browser.

Ready to run in production? Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html).

## Learn more

  * Official website: https://www.phoenixframework.org/
  * Guides: https://hexdocs.pm/phoenix/overview.html
  * Docs: https://hexdocs.pm/phoenix
  * Forum: https://elixirforum.com/c/phoenix-forum
  * Source: https://github.com/phoenixframework/phoenix

## Deploy

Run `fly tokens create deploy -x 999999h` to create a token and set it as the FLY_API_TOKEN secret in your GitHub repository settings

## Development

### Migrations

#### Reset database

`mix ecto.reset`

#### Run seed data

- `mix run priv/repo/seeds.exs`

#### Generate new migration

- `mix ash.codegen <name_of_migration>`
- `mix ash.migrate`

#### Generate cloak key

- `iex> 32 |> :crypto.strong_rand_bytes() |> Base.encode64()`
