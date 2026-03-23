import Link from "next/link"

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6 py-10">
      <h1 className="text-4xl font-semibold tracking-tight text-gray-900">ARTBRIDGE</h1>
      <p className="text-base leading-relaxed text-gray-700">
        Portfolyolar anonim çift körleme ile değerlendirilir. Yeteneği ölçülebilir hale getir, kariyerine yaklaş.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800" href="/login">
          Giriş Yap
        </Link>
        <Link className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50" href="/register">
          Kayıt Ol
        </Link>
      </div>
    </main>
  )
}

