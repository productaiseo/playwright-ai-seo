// import { redirect, notFound } from "next/navigation";
import { type Metadata } from 'next';
import DynamicResults from '@/components/Pages/DynamicResults';

// Generate metadata dynamically based on the page parameter
export async function generateMetadata(
  props: {
    params: Promise<{ domain: string }>;
  }
): Promise<Metadata> {

  const params = await props.params;
  // Extract the domain parameter from the params
  const { domain } = params;
  
  return {
    metadataBase: new URL(`${process.env.NEXT_PUBLIC_URL}`),
    title: domain,
    description: "This is a dynamically generated description.",
  };
}


export default async function DynamicPage(
  props: Readonly<{
    params: Promise<{ domain: string }>;
  }>
) {
  const params = await props.params;
  // Extract the domain parameter from the params
  const { domain } = params;

  return (
    <DynamicResults 
      domain={domain}
    />
  );
}