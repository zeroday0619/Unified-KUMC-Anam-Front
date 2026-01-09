"""API routes for KUMC medical portal."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any
from contextlib import asynccontextmanager
from kumc import KUMCClient

from .schemas import (
    LoginRequest, LoginResponse, APIResponse,
    ReservationRequest, LabTestRequest, MedicationRequest,
    CareHistoryRequest, PaymentListRequest, PaymentDetailRequest
)
from .security import create_access_token, get_current_user
from .config import settings


router = APIRouter(prefix="/api", tags=["API"])


@asynccontextmanager
async def get_authenticated_client(username: str, password: str):
    """
    Get an authenticated KUMC client as async context manager.
    """
    client = KUMCClient()
    try:
        # Initialize with credentials (kumc package uses environment variables by default,
        # but we need to set them programmatically)
        import os
        os.environ["ANAM_USERNAME"] = username
        os.environ["ANAM_PASSWORD"] = password
        
        # Re-create client with new env vars
        client = KUMCClient()
        await client.sign_in()
        yield client
    finally:
        if hasattr(client, 'session') and client.session:
            await client.session.aclose()


async def get_client_from_token(user: dict = Depends(get_current_user)):
    """Dependency to get authenticated client from JWT token."""
    return user


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest) -> LoginResponse:
    """
    Authenticate user with KUMC credentials.
    
    Returns a JWT token for subsequent API calls.
    """
    try:
        async with get_authenticated_client(request.username, request.password) as client:
            # If we get here, login was successful
            access_token = create_access_token(
                data={"sub": request.username, "pwd": request.password}
            )
            
            return LoginResponse(
                success=True,
                message="로그인 성공",
                access_token=access_token
            )
    except Exception as e:
        return LoginResponse(
            success=False,
            message=f"로그인 실패: {str(e)}"
        )


@router.get("/user/info", response_model=APIResponse)
async def get_user_info(user: dict = Depends(get_client_from_token)) -> APIResponse:
    """Get authenticated user information."""
    try:
        async with get_authenticated_client(user["username"], user["password"]) as client:
            data = await client.get_info()
            return APIResponse(success=True, data=data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/reservations", response_model=APIResponse)
async def get_reservations(
    request: ReservationRequest,
    user: dict = Depends(get_client_from_token)
) -> APIResponse:
    """Get user reservations within date range."""
    try:
        async with get_authenticated_client(user["username"], user["password"]) as client:
            data = await client.get_reservations(
                hpCd=request.hospital_code,
                apstYmd=request.start_date,
                apfnYmd=request.end_date
            )
            return APIResponse(success=True, data=data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/lab-tests", response_model=APIResponse)
async def get_lab_test_results(
    request: LabTestRequest,
    user: dict = Depends(get_client_from_token)
) -> APIResponse:
    """Get lab test (diagnostic test) results within date range."""
    try:
        async with get_authenticated_client(user["username"], user["password"]) as client:
            data = await client.get_health_check_result(
                hpCd=request.hospital_code,
                strtYmd=request.start_date,
                fnshYmd=request.end_date
            )
            return APIResponse(success=True, data=data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/medications", response_model=APIResponse)
async def get_medication_history(
    request: MedicationRequest,
    user: dict = Depends(get_client_from_token)
) -> APIResponse:
    """Get medication prescription history within date range."""
    try:
        async with get_authenticated_client(user["username"], user["password"]) as client:
            data = await client.get_medication_prescription_history(
                hpCd=request.hospital_code,
                ordrYmd1=request.start_date,
                ordrYmd2=request.end_date
            )
            return APIResponse(success=True, data=data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/outpatient-history", response_model=APIResponse)
async def get_outpatient_history(
    request: CareHistoryRequest,
    user: dict = Depends(get_client_from_token)
) -> APIResponse:
    """Get outpatient (ambulatory) care history within date range."""
    try:
        async with get_authenticated_client(user["username"], user["password"]) as client:
            data = await client.get_ambulatory_care_history(
                hpCd=request.hospital_code,
                inqrStrtYmd=request.start_date,
                inqrFnshYmd=request.end_date,
                inqrDvsnCd=2
            )
            return APIResponse(success=True, data=data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/hospitalization-history", response_model=APIResponse)
async def get_hospitalization_history(
    request: CareHistoryRequest,
    user: dict = Depends(get_client_from_token)
) -> APIResponse:
    """Get hospitalization and discharge history within date range."""
    try:
        async with get_authenticated_client(user["username"], user["password"]) as client:
            data = await client.get_hospitalization_and_discharge_history(
                hpCd=request.hospital_code,
                inqrStrtYmd=request.start_date,
                inqrFnshYmd=request.end_date,
                inqrDvsnCd=3
            )
            return APIResponse(success=True, data=data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/payments", response_model=APIResponse)
async def get_payment_list(
    request: PaymentListRequest,
    user: dict = Depends(get_client_from_token)
) -> APIResponse:
    """Get payment completed list within date range."""
    try:
        async with get_authenticated_client(user["username"], user["password"]) as client:
            data = await client.get_payed_list(
                hpCd=request.hospital_code,
                strtYmd=request.start_date,
                fnshYmd=request.end_date,
                codvCd=request.code_division
            )
            return APIResponse(success=True, data=data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/payments/detail", response_model=APIResponse)
async def get_payment_detail(
    request: PaymentDetailRequest,
    user: dict = Depends(get_client_from_token)
) -> APIResponse:
    """Get payment detail by payment number."""
    try:
        async with get_authenticated_client(user["username"], user["password"]) as client:
            data = await client.get_payed_detail(
                hpCd=request.hospital_code,
                mdrpNo=request.mdrp_no
            )
            return APIResponse(success=True, data=data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))
