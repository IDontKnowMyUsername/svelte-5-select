import { z } from "zod";

let SelectItemType = z.object({
    label: z.string(),
    value: z.union([z.string(), z.number()]),
});

export const orderSchema = z.object({
    category: SelectItemType,
    item: SelectItemType,
});
