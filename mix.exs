defmodule WandererOps.MixProject do
  use Mix.Project

  def project do
    [
      app: :wanderer_ops,
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      consolidate_protocols: Mix.env() != :dev,
      aliases: aliases(),
      deps: deps(),
      releases: [
        wanderer_ops: [
          include_executables_for: [:unix],
          steps: [:assemble, :tar],
          applications: [
            wanderer_ops: :permanent
          ],
          version: "0.1.0"
        ]
      ],
      compilers: Mix.compilers()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {WandererOps.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(:dev), do: ["lib"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:httpoison, "~> 2.2"},
      {:igniter, "~> 0.5", only: [:dev, :test]},
      {:argon2_elixir, "~> 3.0"},
      {:picosat_elixir, "~> 0.2"},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:dialyxir, ">= 0.0.0", only: [:dev], runtime: false},
      {:doctor, ">= 0.0.0", only: [:dev], runtime: false},
      {:ex_doc, ">= 0.0.0", only: [:dev], runtime: false},
      {:sobelow, ">= 0.0.0", only: [:dev], runtime: false},
      {:mix_audit, ">= 0.0.0", only: [:dev], runtime: false},
      {:ex_check, "~> 0.14.0", only: [:dev], runtime: false},
      {:phoenix, "~> 1.7.14"},
      {:req, "~> 0.5.10"},
      {:phoenix_ecto, "~> 4.5"},
      {:ecto_sql, "~> 3.10"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_html_helpers, "~> 1.0"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "1.0.18", override: true},
      {:phoenix_pubsub, "~> 2.1"},
      {:floki, ">= 0.30.0", only: :test},
      {:phoenix_live_dashboard, "~> 0.8.3"},
      {:heroicons,
       github: "tailwindlabs/heroicons",
       tag: "v2.1.1",
       sparse: "optimized",
       app: false,
       compile: false,
       depth: 1},
      {:swoosh, "~> 1.5"},
      {:finch, "~> 0.13"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 0.20"},
      {:jason, "~> 1.4"},
      {:dns_cluster, "~> 0.1.1"},
      {:bandit, "~> 1.5"},
      {:ash, "~> 3.4"},
      {:ash_phoenix, "~> 2.1"},
      {:ash_postgres, "~> 2.5"},
      {:exsync, "~> 0.4", only: :dev},
      {:cachex, "~> 3.6"},
      {:fresh, "~> 0.4.4"},
      {:better_number, "~> 1.0.0"},
      {:pathex, "~> 2.5"},
      {:mox, "~> 1.1", only: [:test, :integration]},
      {:live_view_events, "~> 0.1.0"},
      {:live_react, "~> 1.0.0-rc.0"},
      {:nodejs, "~> 3.1"},
      {:uuid, "~> 1.1"},
      {:nimble_csv, "~> 1.2.0"},
      {:tidewave, "~> 0.4", only: :dev},
      # Rate limiting
      {:hammer, "~> 7.0"}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["deps.get", "ecto.setup", "assets.setup", "assets.build"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"],
      "assets.setup": ["cmd --cd assets npm install"],
      "assets.build": [
        "cmd --cd assets npm run build",
        "cmd --cd assets npm run build-server"
      ],
      "assets.deploy": [
        "assets.setup",
        "assets.build",
        "phx.digest"
      ]
    ]
  end
end
