import { createClient, type SanityClient } from '@sanity/client';

const projectId = (import.meta.env.PUBLIC_SANITY_PROJECT_ID ?? '').trim();
const dataset = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production';
const useCdn = import.meta.env.PROD;

const VALID_PROJECT_ID = /^[a-z0-9-]+$/;

function getClient(): SanityClient | null {
  if (!projectId || !VALID_PROJECT_ID.test(projectId)) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn,
  });
}

export interface SanityProduct {
  _id: string;
  name: string;
  slug: { current: string };
  tagline?: string;
  description?: string;
  version?: string;
  status?: 'active' | 'beta' | 'coming-soon';
  category?: string;
  externalUrl?: string;
  logo?: string;
  features?: string[];
  icon?: string;
  order?: number;
}

export interface SanityService {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  icon?: string;
}

const PRODUCTS_QUERY = `*[_type == "product" && defined(slug.current)] | order(order asc, name asc) {
  _id,
  name,
  "slug": slug,
  tagline,
  description,
  version,
  status,
  category,
  externalUrl,
  "logo": logo.asset->url,
  features,
  icon,
  order
}`;

const SERVICES_QUERY = `*[_type == "service" && defined(slug.current)] | order(order asc) {
  _id,
  title,
  "slug": slug,
  description,
  icon
}`;

export async function getProducts(): Promise<SanityProduct[]> {
  const client = getClient();
  if (!client) return [];
  try {
    return await client.fetch<SanityProduct[]>(PRODUCTS_QUERY);
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<SanityProduct | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const products = await client.fetch<SanityProduct[]>(
      `*[_type == "product" && slug.current == $slug][0]{ _id, name, slug, tagline, description, version, status, category, externalUrl, "logo": logo.asset->url, features, icon }`,
      { slug }
    );
    return products ?? null;
  } catch {
    return null;
  }
}

export async function getServices(): Promise<SanityService[]> {
  const client = getClient();
  if (!client) return [];
  try {
    return await client.fetch<SanityService[]>(SERVICES_QUERY);
  } catch {
    return [];
  }
}

// Posts (blog)
export interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  body?: unknown;
  publishedAt?: string;
  author?: { name?: string; role?: string } | null;
}

const POSTS_QUERY = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
  _id, title, "slug": slug, excerpt, publishedAt,
  "author": author->{ name, role }
}`;

export async function getPosts(): Promise<SanityPost[]> {
  const client = getClient();
  if (!client) return [];
  try {
    return await client.fetch<SanityPost[]>(POSTS_QUERY);
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<SanityPost | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const post = await client.fetch<SanityPost>(
      `*[_type == "post" && slug.current == $slug][0]{ _id, title, slug, excerpt, body, publishedAt, "author": author->{ name, role } }`,
      { slug }
    );
    return post ?? null;
  } catch {
    return null;
  }
}

// Team members
export interface SanityTeamMember {
  _id: string;
  name: string;
  role?: string;
  bio?: string;
  image?: string;
}

export async function getTeamMembers(): Promise<SanityTeamMember[]> {
  const client = getClient();
  if (!client) return [];
  try {
    return await client.fetch<SanityTeamMember[]>(
      `*[_type == "teamMember"] | order(name asc){ _id, name, role, bio, "image": image.asset->url }`
    );
  } catch {
    return [];
  }
}

// Policy pages
export interface SanityPolicyPage {
  _id: string;
  title: string;
  slug: { current: string };
  body?: unknown;
}

export async function getPolicyPages(): Promise<SanityPolicyPage[]> {
  const client = getClient();
  if (!client) return [];
  try {
    return await client.fetch<SanityPolicyPage[]>(
      `*[_type == "policyPage" && defined(slug.current)] | order(title asc){ _id, title, "slug": slug }`
    );
  } catch {
    return [];
  }
}

export async function getPolicyBySlug(slug: string): Promise<SanityPolicyPage | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const page = await client.fetch<SanityPolicyPage>(
      `*[_type == "policyPage" && slug.current == $slug][0]{ _id, title, slug, body }`,
      { slug }
    );
    return page ?? null;
  } catch {
    return null;
  }
}
