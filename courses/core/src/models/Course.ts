import { Yougen } from './Yougen';

// TODO: 複数の時間割コードに1つの授業が対応する問題

export class Course {
    public readonly id: string;
    public readonly name: string;
    public readonly yougen: Yougen;
    public readonly channelId: string;

    constructor(args: {
        id: string;
        name: string;
        yougen: Yougen;
        channelId: string;
    }) {
        this.id = args.id;
        this.name = args.name;
        this.yougen = args.yougen;
        this.channelId = args.channelId;
    }
}
