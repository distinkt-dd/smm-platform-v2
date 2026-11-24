import type { Service } from "../../entities/profile";

export const ServicesList = ({ services }: { services: Service[] }) => {
    return (
        <section
            aria-labelledby="services-heading"
            className="flex w-full max-w-preview min-w-0 flex-col gap-4"
        >
            <h2 id="services-heading">Услуги</h2>
            {services.length === 0 ? (
                <p className="text-ink-muted">
                    Здесь появятся ваши услуги. Они помогут учитывать вашу
                    практику при создании контента.
                </p>
            ) : (
                <ul className="divide-y divide-line border-y border-line phone:max-h-[50vh] phone:overflow-y-auto">
                    {services.map((service) => (
                        <li
                            key={service.id}
                            className="flex flex-col gap-1 py-4"
                        >
                            <h3 className="font-semibold break-words">
                                {service.title}
                            </h3>
                            {service.description && (
                                <p className="text-ink-muted whitespace-pre-line break-words">
                                    {service.description}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};
