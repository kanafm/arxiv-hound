{
  description = "arxiv-hound: tiny arXiv MCP server and CLI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodejs = pkgs.nodejs_22;
        pnpm = pkgs.pnpm_10;
      in {
        packages.default = pkgs.stdenv.mkDerivation (finalAttrs: {
          pname = "arxiv-hound";
          version = "0.0.1";
          src = ./.;

          pnpmDeps = pkgs.fetchPnpmDeps {
            inherit (finalAttrs) pname version src;
            fetcherVersion = 2;
            hash = "sha256-VK/BAol6exjJYAdkPC7H1AhyB2ClJq2E0sPkKhSdc24=";
          };

          nativeBuildInputs = [
            nodejs
            pnpm
            pkgs.pnpmConfigHook
          ];

          buildPhase = ''
            runHook preBuild
            pnpm build
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p $out/lib/arxiv-hound $out/bin
            cp -r dist node_modules package.json $out/lib/arxiv-hound/
            cat > $out/bin/arxiv-hound <<EOF
            #!${pkgs.runtimeShell}
            exec ${nodejs}/bin/node $out/lib/arxiv-hound/dist/cli.js "\$@"
            EOF
            chmod +x $out/bin/arxiv-hound
            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Tiny arXiv MCP server and CLI: search, fetch, cite";
            homepage = "https://github.com/kanafm/arxiv-hound";
            license = licenses.mit;
            mainProgram = "arxiv-hound";
            platforms = platforms.unix;
          };
        });

        apps.default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/arxiv-hound";
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [ nodejs pnpm ];
          shellHook = ''
            echo "arxiv-hound dev shell: node $(node --version), pnpm $(pnpm --version)"
          '';
        };

        formatter = pkgs.nixpkgs-fmt;
      });
}
