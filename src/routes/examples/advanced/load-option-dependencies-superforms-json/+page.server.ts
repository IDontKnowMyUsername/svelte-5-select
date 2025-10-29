import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from "@sveltejs/kit"
import { zod } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/server";
import { orderSchema } from '../../../../lib-example/order';

export const load: PageServerLoad = async ({ fetch }) => {
    // @ts-expect-error - Type mismatch between Zod schema and SuperForms adapter
    const form = await superValidate({ category: [], item: [] }, zod(orderSchema));
    return { form };
};

export const actions = {
    default: async (event) => {
        // @ts-expect-error - Type mismatch between Zod schema and SuperForms adapter
        const form = await superValidate(event, zod(orderSchema));

        if (!form.valid) {
            console.log('form is not valid!');
            return fail(400, { form });
        } else {
            console.log('form is valid!');
        }

        // Do stuff with your data
        throw redirect(303, "/examples/advanced/load-option-dependencies-superforms-json/success");

    }
} satisfies Actions;

export const prerender = false;