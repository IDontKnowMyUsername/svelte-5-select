export default async function getItems({ loadOptions, convertStringItemsToObjects, filterText }) {
    let res = await loadOptions(filterText).catch((err) => {
        console.warn('svelte-select loadOptions error :>> ', err);
        $host().dispatchEvent(
            new CustomEvent(
                'Error',
                { type: 'loadOptions', details: err }
            )
        );
    });

    if (res && !res.cancelled) {
        if (res) {
            if (res && res.length > 0 && typeof res[0] !== 'object') {
                res = convertStringItemsToObjects(res);
            }
            $host().dispatchEvent(
                new CustomEvent(
                    'Loaded',
                    { items: res }
                )
            );
        } else {
            res = [];
        }

        return {
            filteredItems: res,
            loading: false,
            focused: true,
            listOpen: true,
        };
    }
}
