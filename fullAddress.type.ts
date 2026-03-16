type FullAddress = {
    cep: string,
    street: string,
    number: string,
    complement: string,
    observation: string,
    neighborhood: string,
    city: string,
    state?: string
}

export type AddressViaCep = {
    cep: string,
    state: string,
    city: string,
    neighborhood: string,
    street: string,
    service: string
}

export default FullAddress