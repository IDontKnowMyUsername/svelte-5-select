export default function getItems({ loadOptions, convertStringItemsToObjects, filterText }: {
    loadOptions: any;
    convertStringItemsToObjects: any;
    filterText: any;
}): Promise<{
    filteredItems: any;
    loading: boolean;
    focused: boolean;
    listOpen: boolean;
}>;
