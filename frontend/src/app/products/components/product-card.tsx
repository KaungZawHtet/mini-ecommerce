import Image from "next/image";
import type { Product } from "@/types/api";

export function ProductCard({
  product,
  priority,
}: {
  product: Product;
  priority: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] bg-slate-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={640}
          height={480}
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">
            {product.name}
          </h2>
          <p className="shrink-0 text-sm font-semibold text-slate-950">
            ${product.price}
          </p>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
          {product.description}
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
          {product.stock} in stock
        </p>
      </div>
    </article>
  );
}
