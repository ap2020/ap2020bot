import { DateTime } from "luxon";

const destinations = ["itclms", "email", "classroom"] as const;
type Destination = typeof destinations[number];

export class Assignment {
    readonly id: string;
    readonly courseId: string;
    readonly name: string;
    readonly deadline: DateTime;
    readonly destination: Destination;
    readonly isRequired: boolean | undefined;
    // ? description
    
    constructor(args: {
        id: string;
        courseId: string;
        name: string;
        deadline: DateTime;
        destination: Destination;
        isRequired?: boolean;
    }) {
        this.id = args.id;
        this.courseId = args.courseId;
        this.name = args.name;
        this.deadline = args.deadline;
        this.destination = args.destination;
        this.isRequired = args.isRequired;
    };
};
