
"use client";

const appVersion = "1.0";

export default function SettingsPage() {
  return (
    <div className="space-y-7">
      {/* Introduction */}
      <div>
        <p className="text-sm text-[#7B857D]">Configuration</p>
        <h2 className="mt-1 text-2xl font-semibold text-[#252B27]">
          Paramètres
        </h2>
        <p className="mt-2 text-sm text-[#7B857D]">
          Consulte les informations générales de ta plateforme Tiako Live.
        </p>
      </div>

      {/* Informations de la boutique */}
      <section className="overflow-hidden rounded-2xl border border-[#E5E9E4] bg-white">
        <div className="border-b border-[#E5E9E4] px-6 py-5">
          <h3 className="font-semibold text-[#252B27]">
            Informations de la boutique
          </h3>
          <p className="mt-1 text-sm text-[#7B857D]">
            Informations générales de ton espace vendeur.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <p className="text-xs font-medium text-[#7B857D]">
              Nom de la boutique
            </p>
            <p className="mt-2 text-sm font-semibold text-[#252B27]">
              Tiako dia Tiako
            </p>
          </div>

          <div className="border-t border-[#E5E9E4]" />

          <div>
            <p className="text-xs font-medium text-[#7B857D]">
              Nom de la plateforme
            </p>
            <p className="mt-2 text-sm font-semibold text-[#252B27]">
              Tiako Live
            </p>
          </div>
        </div>
      </section>

      {/* Intégration Facebook */}
      <section className="overflow-hidden rounded-2xl border border-[#E5E9E4] bg-white">
        <div className="border-b border-[#E5E9E4] px-6 py-5">
          <h3 className="font-semibold text-[#252B27]">
            Intégration Facebook
          </h3>
          <p className="mt-1 text-sm text-[#7B857D]">
            Informations sur la connexion avec Facebook.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#252B27]">
                Application Meta
              </p>
              <p className="mt-1 text-xs text-[#7B857D]">
                Tiako Live
              </p>
            </div>

            <span className="w-fit rounded-full bg-[#F0F3EF] px-3 py-1.5 text-xs font-medium text-[#526456]">
              Configuration de test
            </span>
          </div>

          <div className="border-t border-[#E5E9E4]" />

          <div>
            <p className="text-sm font-medium text-[#252B27]">
              Page Facebook de test
            </p>
            <p className="mt-1 text-sm text-[#7B857D]">
              Tiako Live Test
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E9E4] bg-[#F8F9F7] p-4">
            <p className="text-sm font-medium text-[#405C49]">
              À savoir
            </p>
            <p className="mt-2 text-xs leading-6 text-[#7B857D]">
              La réception des commentaires et le fonctionnement complet
              du Live Selling doivent encore être validés avec des tests
              réels. Les informations de connexion ne sont pas modifiables
              depuis cette page.
            </p>
          </div>
        </div>
      </section>

      {/* Informations de l'application */}
      <section className="overflow-hidden rounded-2xl border border-[#E5E9E4] bg-white">
        <div className="border-b border-[#E5E9E4] px-6 py-5">
          <h3 className="font-semibold text-[#252B27]">
            Informations de l&apos;application
          </h3>
          <p className="mt-1 text-sm text-[#7B857D]">
            Détails de la version actuelle.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#252B27]">
                Application
              </p>
              <p className="mt-1 text-xs text-[#7B857D]">
                Plateforme de gestion des ventes en direct
              </p>
            </div>
            <span className="text-sm font-semibold text-[#405C49]">
              Tiako Live
            </span>
          </div>

          <div className="border-t border-[#E5E9E4]" />

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#252B27]">
              Version
            </p>
            <span className="rounded-lg bg-[#F0F3EF] px-3 py-1.5 text-xs font-medium text-[#405C49]">
              {appVersion}
            </span>
          </div>
        </div>
      </section>

      {/* Note finale */}
      <div className="rounded-xl border border-[#E5E9E4] bg-[#F8F9F7] p-5">
        <p className="text-sm font-medium text-[#252B27]">
          Évolution des paramètres
        </p>
        <p className="mt-2 text-sm leading-6 text-[#7B857D]">
          Les options de modification du profil, de gestion des accès et
          de configuration seront ajoutées lorsque les fonctionnalités
          correspondantes seront disponibles.
        </p>
      </div>
    </div>
  );
}
