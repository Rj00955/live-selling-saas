
export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#252B27]">
          Clients
        </h2>
        <p className="mt-2 text-sm text-[#7B857D]">
          Consulte les clients qui passent commande pendant tes Live.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E5E9E4] bg-white p-8 text-center">
        <h3 className="text-base font-semibold text-[#252B27]">
          Aucun client pour le moment
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7B857D]">
          Les clients apparaîtront ici lorsque les commentaires et les
          commandes seront enregistrés dans l&apos;application.
        </p>
      </div>
    </div>
  );
}
