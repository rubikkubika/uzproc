package com.uzproc.backend.dto.cfo;

/**
 * Строка справочника руководителей ЦФО: название ЦФО и связанный пользователь-руководитель.
 * Если {@code userId} = null — руководитель для ЦФО ещё не задан.
 */
public class CfoLeaderDto {

    private String cfoName;
    private Long userId;
    private String leaderFullName;
    private String leaderEmail;

    public CfoLeaderDto() {
    }

    public CfoLeaderDto(String cfoName, Long userId, String leaderFullName, String leaderEmail) {
        this.cfoName = cfoName;
        this.userId = userId;
        this.leaderFullName = leaderFullName;
        this.leaderEmail = leaderEmail;
    }

    public String getCfoName() {
        return cfoName;
    }

    public void setCfoName(String cfoName) {
        this.cfoName = cfoName;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getLeaderFullName() {
        return leaderFullName;
    }

    public void setLeaderFullName(String leaderFullName) {
        this.leaderFullName = leaderFullName;
    }

    public String getLeaderEmail() {
        return leaderEmail;
    }

    public void setLeaderEmail(String leaderEmail) {
        this.leaderEmail = leaderEmail;
    }
}
