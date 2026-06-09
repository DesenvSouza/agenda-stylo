import { notFound } from "next/navigation";
import { BookingWizard } from "@/components/booking/BookingWizard";

async function getPageData(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  try {
    const res = await fetch(`${apiUrl}/api/public/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { serviceId?: string; professionalId?: string };
}) {
  const data = await getPageData(params.slug);
  if (!data) notFound();

  return (
    <BookingWizard
      slug={params.slug}
      establishment={data.establishment}
      services={data.services}
      professionals={data.professionals}
      initialServiceId={searchParams.serviceId}
      initialProfessionalId={searchParams.professionalId}
    />
  );
}
