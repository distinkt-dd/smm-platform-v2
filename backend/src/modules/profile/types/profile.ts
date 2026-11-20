import { ConfirmedFact } from "../../../common/types/confirmed-fact.js";
import { Service } from "../../../common/types/services.js";

export type ProfilePublic = {
    id: string;
    displayName: string;
    specialization: string;
    about: string | null;
    confirmedFacts: ConfirmedFact[];
    services: Service[];
}

