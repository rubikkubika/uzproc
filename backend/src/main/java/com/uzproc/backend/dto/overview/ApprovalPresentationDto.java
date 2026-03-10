package com.uzproc.backend.dto.overview;

import java.util.List;

public class ApprovalPresentationDto {

    private List<String> conclusions;

    public ApprovalPresentationDto() {}

    public ApprovalPresentationDto(List<String> conclusions) {
        this.conclusions = conclusions;
    }

    public List<String> getConclusions() { return conclusions; }
    public void setConclusions(List<String> conclusions) { this.conclusions = conclusions; }
}
