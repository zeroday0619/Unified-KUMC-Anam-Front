"""Pydantic models for request/response schemas."""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import date


class LoginRequest(BaseModel):
    """Login request schema."""
    username: str = Field(..., min_length=1, description="KUMC 사용자 ID")
    password: str = Field(..., min_length=1, description="비밀번호")


class LoginResponse(BaseModel):
    """Login response schema."""
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: str = "bearer"


class DateRangeRequest(BaseModel):
    """Date range request schema."""
    start_date: int = Field(..., description="시작 날짜 (YYYYMMDD)")
    end_date: int = Field(..., description="종료 날짜 (YYYYMMDD)")
    hospital_code: str = Field(default="AA", description="병원 코드")


class ReservationRequest(DateRangeRequest):
    """Reservation request schema."""
    pass


class LabTestRequest(DateRangeRequest):
    """Lab test (diagnostic test) request schema."""
    pass


class MedicationRequest(DateRangeRequest):
    """Medication request schema."""
    pass


class CareHistoryRequest(DateRangeRequest):
    """Care history request schema."""
    inquiry_type: int = Field(default=2, description="조회 구분 (2: 외래, 3: 입퇴원)")


class PaymentListRequest(DateRangeRequest):
    """Payment list request schema."""
    code_division: str = Field(default="O", description="구분 코드 (O: 외래, I: 입원)")


class PaymentDetailRequest(BaseModel):
    """Payment detail request schema."""
    hospital_code: str = Field(default="AA", description="병원 코드")
    mdrp_no: int = Field(..., description="수납 번호")


class APIResponse(BaseModel):
    """Generic API response schema."""
    success: bool
    message: str = ""
    data: Optional[Any] = None


class UserInfo(BaseModel):
    """User information schema - matches KUMC API response."""
    instMemNo: Optional[str] = Field(None, description="기관회원번호")
    memId: Optional[str] = Field(None, description="회원 ID")
    memPwdChangeDay: Optional[int] = Field(None, description="비밀번호 변경 주기")
    memName: Optional[str] = Field(None, description="회원 이름")
    memBirth: Optional[str] = Field(None, description="생년월일 (YYYYMMDD)")
    memGender: Optional[str] = Field(None, description="성별 (M/F)")
    memEmail: Optional[str] = Field(None, description="이메일")
    memHpNo: Optional[str] = Field(None, description="휴대폰 번호")
    memZipcode: Optional[str] = Field(None, description="우편번호")
    memAddress1: Optional[str] = Field(None, description="주소1")
    memAddress2: Optional[str] = Field(None, description="주소2")
    memEmailAgreeYn: Optional[str] = Field(None, description="이메일 수신 동의")
    memSmsAgreeYn: Optional[str] = Field(None, description="SMS 수신 동의")
    memType: Optional[str] = Field(None, description="회원 유형")
    memJoinRoute: Optional[str] = Field(None, description="가입 경로")
    memLastLoginIp: Optional[str] = Field(None, description="마지막 로그인 IP")
    memAaPatId: Optional[str] = Field(None, description="환자 ID")
    instNo: Optional[int] = Field(None, description="기관 번호")
    aaNewsYn: Optional[str] = Field(None, description="안암 뉴스 수신")
    grNewsYn: Optional[str] = Field(None, description="구로 뉴스 수신")
    asNewsYn: Optional[str] = Field(None, description="안산 뉴스 수신")
    username: Optional[str] = Field(None, description="사용자명")
