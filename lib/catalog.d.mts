import type { CatalogModel } from "./types";
export function normalizeOpenRouter(data: unknown): CatalogModel[];
export function normalizeHuggingFace(data: unknown): CatalogModel[];
export function deduplicateCatalog(models: CatalogModel[]): CatalogModel[];
