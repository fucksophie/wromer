// place files you want to import through the `$lib` alias in this folder.

import { KristApi } from 'krist';

export const verified = {
	serverwelf: 'ReconnectedCC server wallet.',
	km2qpoer6h: 'Femcorp store wallet',
	kromerluvr: "Tyler's enchant shop",
	ksugarcane: "Sophie's general store",
	k75w1utsbr: "Twijn's ore shop",
	k8se5pjcel: "Chris' shop",
	krb1yie41o: "Seth's soakbot"
};

export const api = new KristApi({
	syncNode: 'https://kromer.reconnected.cc/api/krist/'
});
