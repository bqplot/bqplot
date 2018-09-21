float scale_transform_linear(float domain_value, vec2 range, vec2 domain) {
    float normalized = (domain_value - domain[0]) / (domain[1] - domain[0]);
    float range_value = normalized * (range[1] - range[0]) + range[0];
    return range_value;
}

float scale_transform_linear_inverse(float range_value, vec2 range, vec2 domain) {
    float normalized = (range_value - range[0]) / (range[1] - range[0]);
    float domain_value = normalized * (domain[1] - domain[0]) + domain[0];
    return domain_value;
}

float scale_transform_log(float domain_value, vec2 range, vec2 domain) {
    float normalized = (log(domain_value) - log(domain[0])) / (log(domain[1]) - log(domain[0]));
    float range_value = normalized * (range[1] - range[0]) + range[0];
    return range_value;
}

float scale_transform_log_inverse(float range_value, vec2 range, vec2 domain) {
    float normalized = (range_value - range[0]) / (range[1] - range[0]);
    float domain_value = exp(normalized * (log(domain[1]) - log(domain[0])) + log(domain[0]));
    return domain_value;
}