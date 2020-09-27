import { filterNewItems } from '.';

describe('filterNewItems', () => {
    it('filters out known urls', () => {
        const oldURLs = [
            'url1',
            'url2',
            'url3',
        ];
        const fetchedItems = [
            { url: 'url2', title: 'title2' },
            { url: 'url3', title: 'title3' },
            { url: 'url4', title: 'title4' },
        ];
        const newItems = filterNewItems(oldURLs, fetchedItems);
        expect(newItems).toEqual([{ url: 'url4', title: 'title4' }]);
    });
});
