
"use client";

const stats = [
  { label: "Commentaires reçus", value: "0", icon: "💬" },
  { label: "Commandes détectées", value: "0", icon: "🛍️" },
  { label: "Commandes en attente", value: "0", icon: "⏳" },
  { label: "Chiffre d'affaires", value: "0 Ar", icon: "💰" },
];

export default function LiveSellingPage() {
  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#252B27]">
            Live Selling
          </h1>
          <p className="mt-2 text-sm text-[#7B857D]">
            Gérez vos sessions Facebook Live et suivez les commandes en direct.
          </p>
        </div>

        <button
          type="button"
          disabled
          title="Disponible après la connexion à l'API Meta"
          className="cursor-not-allowed rounded-xl bg-[#405C49] px-5 py-3 text-sm font-medium text-white opacity-50"
        >
          + Démarrer un live
        </button>
      </div>

      {/* Session active */}
      <section className="rounded-2xl border border-[#E5E9E4] bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-gray-400" />
              <h2 className="text-lg font-semibold text-[#252B27]">
                Aucune session active
              </h2>
            </div>
            <p className="mt-2 text-sm text-[#7B857D]">
              Connectez votre compte Facebook pour commencer à suivre vos lives.
            </p>
          </div>

          <span className="w-fit rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
            Hors ligne
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[#F8F9F7] p-4">
            <p className="text-xs text-[#7B857D]">Titre de la session</p>
            <p className="mt-2 text-sm font-medium text-[#252B27]">
              Aucune session
            </p>
          </div>

          <div className="rounded-xl bg-[#F8F9F7] p-4">
            <p className="text-xs text-[#7B857D]">Début de la session</p>
            <p className="mt-2 text-sm font-medium text-[#252B27]">
              Non disponible
            </p>
          </div>

          <div className="rounded-xl bg-[#F8F9F7] p-4">
            <p className="text-xs text-[#7B857D]">Statut Facebook</p>
            <p className="mt-2 text-sm font-medium text-[#252B27]">
              Non connecté
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-[#D7DED8] bg-[#F8F9F7] p-6 text-center">
          <div className="text-3xl">📹</div>
          <h3 className="mt-3 font-semibold text-[#252B27]">
            Votre espace Live Selling
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#7B857D]">
            Les informations de votre session, les commentaires des clients
            et les commandes détectées apparaîtront ici lorsque l&apos;intégration
            Facebook sera disponible.
          </p>
        </div>
      </section>

      {/* Statistiques */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#252B27]">
          Statistiques de la session
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#E5E9E4] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#7B857D]">{stat.label}</p>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className="mt-4 text-2xl font-bold text-[#252B27]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Suivi en direct */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#E5E9E4] bg-white">
          <div className="border-b border-[#E5E9E4] p-5">
            <h2 className="font-semibold text-[#252B27]">
              Commentaires en direct
            </h2>
            <p className="mt-1 text-sm text-[#7B857D]">
              Les commentaires Facebook reçus apparaîtront ici.
            </p>
          </div>

          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <span className="text-3xl">💬</span>
            <p className="mt-3 text-sm font-medium text-[#252B27]">
              Aucun commentaire pour le moment
            </p>
            <p className="mt-1 text-xs text-[#7B857D]">
              En attente d&apos;une session Live connectée.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E5E9E4] bg-white">
          <div className="border-b border-[#E5E9E4] p-5">
            <h2 className="font-semibold text-[#252B27]">
              Commandes détectées
            </h2>
            <p className="mt-1 text-sm text-[#7B857D]">
              Les intentions d&apos;achat identifiées seront affichées ici.
            </p>
          </div>

          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <span className="text-3xl">🛍️</span>
            <p className="mt-3 text-sm font-medium text-[#252B27]">
              Aucune commande détectée
            </p>
            <p className="mt-1 text-xs text-[#7B857D]">
              Les commandes apparaîtront pendant une session connectée.
            </p>
          </div>
        </section>
      </div>

      {/* Historique des sessions */}
      <section className="overflow-hidden rounded-2xl border border-[#E5E9E4] bg-white">
        <div className="border-b border-[#E5E9E4] p-5">
          <h2 className="font-semibold text-[#252B27]">
            Historique des sessions
          </h2>
          <p className="mt-1 text-sm text-[#7B857D]">
            Retrouvez ici les sessions Live précédentes.
          </p>
        </div>

        <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
          <span className="text-3xl">📂</span>
          <p className="mt-3 text-sm font-medium text-[#252B27]">
            Aucune session enregistrée
          </p>
          <p className="mt-1 text-xs text-[#7B857D]">
            Vos anciennes sessions apparaîtront ici.
          </p>
        </div>
      </section>

      {/* Information */}
      <div className="rounded-2xl border border-[#DCE9DF] bg-[#EDF4EE] p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-[#405C49]">
              Intégration Facebook
            </h3>
            <p className="mt-1 text-sm leading-6 text-[#526B58]">
              Cette interface est préparée pour accueillir les sessions Live,
              la réception des commentaires et la détection automatique
              des commandes. Les données seront affichées après connexion
              aux services backend et Meta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
