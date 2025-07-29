// place files you want to import through the `$lib` alias in this folder.

import { KristApi } from 'krist';

export const verified = {
	serverwelf: 'ReconnectedCC server wallet.',
	km2qpoer6h: 'Femcorp store wallet',
	kbogmyonzn: "Tyler's enchant shop",
	kqvqffjcl: "Sophie's general store",
	k75w1utsbr: "Twijn's ore shop",
	k8se5pjcel: "Chris' shop"
};

export const api = new KristApi({
	syncNode: 'https://kromer.reconnected.cc/api/krist/'
});
