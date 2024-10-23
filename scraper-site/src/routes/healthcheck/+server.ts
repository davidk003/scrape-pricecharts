import { json } from '@sveltejs/kit';

export async function GET({ request }) {
	return json({ status: 'ok' });
}
