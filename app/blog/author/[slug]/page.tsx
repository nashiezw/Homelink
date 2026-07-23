import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BlogCard } from "@/components/blog/blog-card";
import { getPublicBlogAuthor } from "@/lib/blog/blog-repository";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicBlogAuthor(slug, { page: 1, limit: 12 });
  if (!data) return {};
  return {
    title: `${data.author.name} Articles | HouseLink Zimbabwe`,
    description: data.author.bio ?? `Read property resources written by ${data.author.name} on HouseLink Zimbabwe.`,
    alternates: { canonical: `/blog/author/${data.author.slug}` },
    openGraph: {
      title: `${data.author.name} Articles | HouseLink Zimbabwe`,
      description: data.author.bio ?? undefined,
      images: data.author.avatarUrl ? [{ url: data.author.avatarUrl }] : [{ url: "/images/houselink-hero.webp" }],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function BlogAuthorPage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicBlogAuthor(slug, { page: 1, limit: 12 });
  if (!data) notFound();
  return (
    <main className="bg-mist text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[auto_1fr] lg:px-8">
          <div className="relative size-16 overflow-hidden rounded-lg bg-white/10 sm:size-24">
            {data.author.avatarUrl ? <Image src={data.author.avatarUrl} alt={data.author.name} fill className="object-cover" /> : null}
          </div>
          <div>
            <p className="section-eyebrow text-emerald-200">HouseLink author</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal sm:text-5xl">{data.author.name}</h1>
            {data.author.role ? <p className="mt-2 font-semibold text-emerald-100">{data.author.role}</p> : null}
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{data.author.bio ?? "Practical property resources from HouseLink Zimbabwe."}</p>
            <p className="mt-4 text-sm text-slate-400">{data.total} published article{data.total === 1 ? "" : "s"}</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.posts.map((post) => <BlogCard key={post.id} post={post} />)}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: data.author.name,
            description: data.author.bio,
            image: data.author.avatarUrl,
            url: `/blog/author/${data.author.slug}`,
          }),
        }}
      />
    </main>
  );
}
