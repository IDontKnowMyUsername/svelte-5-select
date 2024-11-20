export default async function getItems({ loadOptions, convertStringItemsToObjects, filterText, onerror, onloaded }) {
    let res = await loadOptions(filterText).catch((err) => {
        console.warn('svelte-5-select loadOptions error :>> ', err);
        onerror(err);
    });

    if (res && !res.cancelled) {
        if (res) {
            if (res && res.length > 0 && typeof res[0] !== 'object') {
                res = convertStringItemsToObjects(res);
            }
            onloaded(res);
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
